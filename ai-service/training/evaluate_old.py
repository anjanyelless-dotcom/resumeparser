#!/usr/bin/env python3
"""
Evaluation script for trained DeBERTa-v3 NER model.

This script:
1. Loads the saved fine-tuned model
2. Runs evaluation on the test set
3. Prints detailed accuracy report
4. Shows examples of correct/incorrect predictions
"""

import os
import json
import numpy as np
from typing import List, Dict, Any, Tuple
from datasets import Dataset
from transformers import (
    AutoTokenizer, 
    AutoModelForTokenClassification,
    DataCollatorForTokenClassification
)
import torch
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt
from datetime import datetime

# Configuration
MODEL_DIR = '../models/resume-ner-deberta'
DATA_DIR = './data'
OUTPUT_DIR = './evaluation_results'

# Entity labels
LABELS = [
    'O', 'B-NAME', 'I-NAME', 'B-ORG', 'I-ORG', 'B-TITLE', 'I-TITLE',
    'B-SKILL', 'I-SKILL', 'B-EDU', 'I-EDU', 'B-DATE', 'I-DATE', 'B-LOC', 'I-LOC'
]

class ModelEvaluator:
    def __init__(self):
        self.tokenizer = None
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.label_to_id = None
        self.id_to_label = None
        
    def load_model(self):
        """Load the trained model and tokenizer"""
        print(f"🤖 Loading model from {MODEL_DIR}...")
        
        if not os.path.exists(MODEL_DIR):
            raise FileNotFoundError(f"Model directory not found: {MODEL_DIR}")
            
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
        
        # Load model
        self.model = AutoModelForTokenClassification.from_pretrained(MODEL_DIR)
        self.model.to(self.device)
        self.model.eval()
        
        # Load label mapping
        labels_path = os.path.join(MODEL_DIR, 'labels.json')
        if os.path.exists(labels_path):
            with open(labels_path, 'r') as f:
                label_config = json.load(f)
                self.label_to_id = label_config['label2id']
                self.id_to_label = label_config['id2label']
        else:
            # Fallback to default labels
            self.id_to_label = {i: label for i, label in enumerate(LABELS)}
            self.label_to_id = {label: i for i, label in enumerate(LABELS)}
            
        print(f"✅ Model loaded successfully on {self.device}")
        print(f"   Number of labels: {len(self.id_to_label)}")
        
    def load_test_data(self) -> List[Dict]:
        """Load test data from JSON file"""
        print("📁 Loading test data...")
        
        test_path = os.path.join(DATA_DIR, 'test.json')
        with open(test_path, 'r', encoding='utf-8') as f:
            test_data = json.load(f)
            
        print(f"✅ Loaded {len(test_data)} test examples")
        return test_data
        
    def tokenize_and_align_labels(self, examples: List[Dict]) -> Dict:
        """Tokenize text and align NER labels with tokenized inputs"""
        tokenized_inputs = self.tokenizer(
            examples['tokens'],
            truncation=True,
            padding=True,
            is_split_into_words=True,
            return_tensors='pt'
        )
        
        labels = []
        
        for i, label_seq in enumerate(examples['ner_tags']):
            word_ids = tokenized_inputs.word_ids(batch_index=i)
            previous_word_idx = None
            label_ids = []
            
            for word_idx in word_ids:
                if word_idx is None:
                    # Special tokens ([CLS], [SEP], etc.)
                    label_ids.append(-100)
                elif word_idx != previous_word_idx:
                    # First token of a new word
                    if word_idx < len(label_seq):
                        label = label_seq[word_idx]
                        label_ids.append(self.label_to_id.get(label, 0))
                    else:
                        label_ids.append(0)
                else:
                    # Subsequent tokens of the same word
                    label_ids.append(-100)
                    
                previous_word_idx = word_idx
                
            labels.append(label_ids)
            
        tokenized_inputs['labels'] = labels
        return tokenized_inputs
        
    def prepare_dataset(self, test_data: List[Dict]) -> Dataset:
        """Prepare test dataset"""
        print("🔧 Preparing test dataset...")
        
        # Convert to HuggingFace dataset
        test_dataset = Dataset.from_list(test_data)
        
        # Tokenize and align labels
        test_dataset = test_dataset.map(
            self.tokenize_and_align_labels,
            batched=True,
            remove_columns=test_dataset.column_names
        )
        
        print(f"✅ Test dataset prepared with {len(test_dataset)} examples")
        return test_dataset
        
    def predict(self, dataset: Dataset) -> Tuple[np.ndarray, np.ndarray]:
        """Run predictions on the dataset"""
        print("🔮 Running predictions...")
        
        predictions = []
        true_labels = []
        
        # Create data collator
        data_collator = DataCollatorForTokenClassification(
            tokenizer=self.tokenizer,
            padding=True,
            return_tensors='pt'
        )
        
        # Process in batches to avoid memory issues
        batch_size = 8
        
        for i in range(0, len(dataset), batch_size):
            batch = dataset[i:i+batch_size]
            
            # Prepare batch
            batch_inputs = {
                'input_ids': torch.stack([torch.tensor(ids) for ids in batch['input_ids']]),
                'attention_mask': torch.stack([torch.tensor(mask) for mask in batch['attention_mask']]),
                'labels': torch.stack([torch.tensor(labels) for labels in batch['labels']])
            }
            
            # Move to device
            batch_inputs = {k: v.to(self.device) for k, v in batch_inputs.items()}
            
            # Get predictions
            with torch.no_grad():
                outputs = self.model(**batch_inputs)
                batch_predictions = torch.argmax(outputs.logits, dim=-1)
                
            # Collect results
            predictions.extend(batch_predictions.cpu().numpy())
            true_labels.extend(batch_inputs['labels'].cpu().numpy())
            
            if (i // batch_size + 1) % 10 == 0:
                print(f"   Processed {min(i + batch_size, len(dataset))}/{len(dataset)} examples")
                
        print("✅ Predictions completed")
        return np.array(predictions), np.array(true_labels)
        
    def compute_metrics(self, predictions: np.ndarray, true_labels: np.ndarray) -> Dict:
        """Compute detailed evaluation metrics"""
        print("📊 Computing evaluation metrics...")
        
        # Remove ignored index (-100) and flatten
        true_predictions_flat = []
        true_labels_flat = []
        
        for pred_seq, true_seq in zip(predictions, true_labels):
            for pred, true in zip(pred_seq, true_seq):
                if true != -100:
                    true_predictions_flat.append(pred)
                    true_labels_flat.append(true)
        
        # Convert to label names
        pred_labels = [self.id_to_label[pred] for pred in true_predictions_flat]
        true_label_names = [self.id_to_label[true] for true in true_labels_flat]
        
        # Generate classification report
        report = classification_report(
            true_label_names, 
            pred_labels, 
            labels=LABELS,
            zero_division=0,
            output_dict=True,
            digits=4
        )
        
        return report, pred_labels, true_label_names
        
    def print_detailed_report(self, report: Dict):
        """Print detailed evaluation report"""
        print("\n" + "="*80)
        print("📊 DETAILED EVALUATION REPORT")
        print("="*80)
        
        # Overall metrics
        print(f"Overall Accuracy: {report['accuracy']:.4f}")
        print(f"Macro Avg F1: {report['macro avg']['f1-score']:.4f}")
        print(f"Weighted Avg F1: {report['weighted avg']['f1-score']:.4f}")
        
        print("\n📈 Per-Entity Performance:")
        print("-" * 60)
        print(f"{'Entity':<10} {'Precision':<10} {'Recall':<10} {'F1-Score':<10} {'Support':<10}")
        print("-" * 60)
        
        entity_types = ['NAME', 'ORG', 'TITLE', 'SKILL', 'EDU', 'DATE', 'LOC']
        
        for entity in entity_types:
            b_entity = f'B-{entity}'
            i_entity = f'I-{entity}'
            
            # Get metrics for B- and I- tags
            if b_entity in report:
                precision_b = report[b_entity]['precision']
                recall_b = report[b_entity]['recall']
                f1_b = report[b_entity]['f1-score']
                support_b = report[b_entity]['support']
            else:
                precision_b = recall_b = f1_b = support_b = 0
                
            if i_entity in report:
                precision_i = report[i_entity]['precision']
                recall_i = report[i_entity]['recall']
                f1_i = report[i_entity]['f1-score']
                support_i = report[i_entity]['support']
            else:
                precision_i = recall_i = f1_i = support_i = 0
                
            # Calculate weighted average for entity type
            total_support = support_b + support_i
            if total_support > 0:
                avg_precision = (precision_b * support_b + precision_i * support_i) / total_support
                avg_recall = (recall_b * support_b + recall_i * support_i) / total_support
                avg_f1 = (f1_b * support_b + f1_i * support_i) / total_support
            else:
                avg_precision = avg_recall = avg_f1 = 0.0
                
            print(f"{entity:<10} {avg_precision:<10.4f} {avg_recall:<10.4f} {avg_f1:<10.4f} {int(total_support):<10}")
        
        print("-" * 60)
        
    def show_prediction_examples(self, test_data: List[Dict], predictions: np.ndarray, true_labels: np.ndarray):
        """Show examples of correct and incorrect predictions"""
        print("\n🔍 PREDICTION EXAMPLES")
        print("="*80)
        
        # Find examples for each category
        correct_examples = []
        incorrect_examples = []
        
        for i, (pred_seq, true_seq) in enumerate(zip(predictions, true_labels)):
            if i >= len(test_data):
                break
                
            example = test_data[i]
            tokens = example['tokens']
            true_tags = example['ner_tags']
            
            # Convert predictions to labels
            pred_tags = []
            true_filtered = []
            pred_filtered = []
            tokens_filtered = []
            
            for j, (pred, true) in enumerate(zip(pred_seq, true_seq)):
                if true != -100 and j < len(tokens):
                    pred_label = self.id_to_label[pred]
                    true_label = true_tags[j] if j < len(true_tags) else 'O'
                    
                    pred_tags.append(pred_label)
                    true_filtered.append(true_label)
                    pred_filtered.append(pred_label)
                    tokens_filtered.append(tokens[j])
            
            # Check if prediction is correct
            is_correct = pred_filtered == true_filtered
            
            if is_correct and len(correct_examples) < 3:
                correct_examples.append({
                    'tokens': tokens_filtered,
                    'true_tags': true_filtered,
                    'pred_tags': pred_filtered
                })
            elif not is_correct and len(incorrect_examples) < 3:
                incorrect_examples.append({
                    'tokens': tokens_filtered,
                    'true_tags': true_filtered,
                    'pred_tags': pred_filtered
                })
                
            if len(correct_examples) >= 3 and len(incorrect_examples) >= 3:
                break
        
        # Show correct examples
        print("\n✅ CORRECT PREDICTION EXAMPLES:")
        print("-" * 80)
        for i, example in enumerate(correct_examples):
            print(f"\nExample {i+1}:")
            for token, true_tag, pred_tag in zip(example['tokens'], example['true_tags'], example['pred_tags']):
                if true_tag != 'O' or pred_tag != 'O':
                    print(f"  {token:<15} True: {true_tag:<10} Pred: {pred_tag}")
        
        # Show incorrect examples
        print("\n❌ INCORRECT PREDICTION EXAMPLES:")
        print("-" * 80)
        for i, example in enumerate(incorrect_examples):
            print(f"\nExample {i+1}:")
            for token, true_tag, pred_tag in zip(example['tokens'], example['true_tags'], example['pred_tags']):
                if true_tag != 'O' or pred_tag != 'O':
                    match = "✓" if true_tag == pred_tag else "✗"
                    print(f"  {token:<15} True: {true_tag:<10} Pred: {pred_tag:<10} {match}")
        
    def save_results(self, report: Dict, predictions: np.ndarray, true_labels: np.ndarray):
        """Save evaluation results to files"""
        print(f"\n💾 Saving results to {OUTPUT_DIR}...")
        
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        # Save detailed report
        with open(os.path.join(OUTPUT_DIR, 'evaluation_report.json'), 'w') as f:
            json.dump(report, f, indent=2)
            
        # Save predictions and true labels
        np.save(os.path.join(OUTPUT_DIR, 'predictions.npy'), predictions)
        np.save(os.path.join(OUTPUT_DIR, 'true_labels.npy'), true_labels)
        
        # Save summary
        summary = {
            'timestamp': datetime.now().isoformat(),
            'model_path': MODEL_DIR,
            'test_samples': len(predictions),
            'overall_accuracy': report['accuracy'],
            'macro_f1': report['macro avg']['f1-score'],
            'weighted_f1': report['weighted avg']['f1-score']
        }
        
        with open(os.path.join(OUTPUT_DIR, 'summary.json'), 'w') as f:
            json.dump(summary, f, indent=2)
            
        print(f"✅ Results saved to {OUTPUT_DIR}")
        
    def evaluate(self):
        """Main evaluation pipeline"""
        print("🚀 Starting model evaluation...")
        print(f"Model: {MODEL_DIR}")
        print(f"Data: {DATA_DIR}")
        print(f"Device: {self.device}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("="*80)
        
        try:
            # Load model
            self.load_model()
            
            # Load test data
            test_data = self.load_test_data()
            
            # Prepare dataset
            dataset = self.prepare_dataset(test_data)
            
            # Run predictions
            predictions, true_labels = self.predict(dataset)
            
            # Compute metrics
            report, pred_labels, true_label_names = self.compute_metrics(predictions, true_labels)
            
            # Print detailed report
            self.print_detailed_report(report)
            
            # Show examples
            self.show_prediction_examples(test_data, predictions, true_labels)
            
            # Save results
            self.save_results(report, predictions, true_labels)
            
            print("\n🎉 Evaluation completed successfully!")
            print(f"Final F1 Score: {report['weighted avg']['f1-score']:.4f}")
            
        except Exception as e:
            print(f"❌ Evaluation failed: {e}")
            raise

def main():
    """Main function"""
    evaluator = ModelEvaluator()
    evaluator.evaluate()

if __name__ == "__main__":
    main()
