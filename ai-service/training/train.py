#!/usr/bin/env python3
"""
Fine-tuning script for DeBERTa-v3 on resume NER task.

This script:
1. Loads training data from JSON files or Doccano JSONL format
2. Tokenizes and aligns labels
3. Fine-tunes DeBERTa-v3-base on resume entity recognition
4. Evaluates and saves the best model

Supports custom labels:
COMPANY, CLIENT, ROLE, LOCATION, START_DATE, END_DATE, EDUCATION, DEGREE
Note: PERSON handled separately with regex pattern matching
"""

import os
import sys
import json
import numpy as np
from typing import List, Dict, Any

# Remove this directory from sys.path to prevent importing the local evaluate.py
# script instead of the 'evaluate' pip package
_this_dir = os.path.dirname(os.path.abspath(__file__))
if _this_dir in sys.path:
    sys.path.remove(_this_dir)

# Add parent directory to sys.path to import model_loader
_parent_dir = os.path.dirname(_this_dir)
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

from datasets import Dataset
from transformers import (
    TrainingArguments, 
    Trainer, 
    DataCollatorForTokenClassification
)
from sklearn.metrics import precision_recall_fscore_support, classification_report
import torch
from datetime import datetime

# Import model loader
from model_loader import ModelLoader, get_label_mappings, LABELS, LABEL_TO_ID, ID_TO_LABEL

# Configuration
OUTPUT_DIR = './training/checkpoints'
FINAL_MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models', 'resume-ner-deberta')
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

class ResumeNERTrainer:
    def __init__(self):
        self.tokenizer = None
        self.model = None
        self.train_dataset = None
        self.test_dataset = None
        self.data_collator = None
        
    def load_data(self) -> tuple:
        """Load training and test data from JSON files"""
        print("📁 Loading training data...")
        
        # Load train data
        train_path = os.path.join(DATA_DIR, 'train.json')
        with open(train_path, 'r', encoding='utf-8') as f:
            train_data = json.load(f)
            
        # Load test data
        test_path = os.path.join(DATA_DIR, 'test.json')
        with open(test_path, 'r', encoding='utf-8') as f:
            test_data = json.load(f)
            
        print(f"✅ Loaded {len(train_data)} training examples")
        print(f"✅ Loaded {len(test_data)} test examples")
        
        return train_data, test_data
        
    def initialize_model_and_tokenizer(self):
        """Initialize DeBERTa-v3 model and tokenizer using ModelLoader"""
        print("🤖 Initializing DeBERTa-v3 model and tokenizer...")
        
        # Use ModelLoader to load model and tokenizer
        loader = ModelLoader()
        self.tokenizer, self.model = loader.load(for_training=True)
        
        # Initialize data collator
        self.data_collator = DataCollatorForTokenClassification(
            tokenizer=self.tokenizer,
            padding=True
        )
        
        print(f"✅ Model initialized with {len(LABELS)} labels")
        print(f"   Labels: {', '.join(LABELS[:5])}...")
        
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
        
        for i, label_seq in enumerate(examples['labels']):
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
                        label_ids.append(LABEL_TO_ID.get(label, 0))  # Default to 'O' if not found
                    else:
                        label_ids.append(0)
                else:
                    # Subsequent tokens of the same word
                    label_ids.append(-100)
                    
                previous_word_idx = word_idx
                
            labels.append(label_ids)
            
        tokenized_inputs['labels'] = labels
        return tokenized_inputs
        
    def prepare_datasets(self, train_data: List[Dict], test_data: List[Dict]):
        """Prepare datasets for training"""
        print("🔧 Preparing datasets...")
        
        # Convert to HuggingFace datasets
        train_dataset = Dataset.from_list(train_data)
        test_dataset = Dataset.from_list(test_data)
        
        # Tokenize and align labels
        train_dataset = train_dataset.map(
            self.tokenize_and_align_labels,
            batched=True,
            remove_columns=train_dataset.column_names
        )
        
        test_dataset = test_dataset.map(
            self.tokenize_and_align_labels,
            batched=True,
            remove_columns=test_dataset.column_names
        )
        
        self.train_dataset = train_dataset
        self.test_dataset = test_dataset
        
        print(f"✅ Datasets prepared with {len(train_dataset)} train and {len(test_dataset)} test examples")
        
    def compute_metrics(self, eval_pred):
        """Compute evaluation metrics"""
        predictions, labels = eval_pred
        predictions = np.argmax(predictions, axis=2)

        # Flatten, removing ignored index (-100) — keep as integer IDs
        true_predictions_flat = []
        true_labels_flat = []
        for pred_seq, label_seq in zip(predictions, labels):
            for p, l in zip(pred_seq, label_seq):
                if l != -100:
                    true_predictions_flat.append(int(p))
                    true_labels_flat.append(int(l))

        precision, recall, f1, _ = precision_recall_fscore_support(
            true_labels_flat, true_predictions_flat,
            average='weighted', zero_division=0
        )

        return {
            "precision": float(precision),
            "recall": float(recall),
            "f1": float(f1)
        }
        
    def setup_training_arguments(self) -> TrainingArguments:
        """Setup training arguments"""
        return TrainingArguments(
            output_dir=OUTPUT_DIR,
            num_train_epochs=5,
            learning_rate=2e-5,
            per_device_train_batch_size=1,  # Reduced to 1 to avoid OOM errors with long texts
            per_device_eval_batch_size=1,
            gradient_accumulation_steps=8,  # Accumulate gradients to simulate batch size of 8
            warmup_steps=500,
            weight_decay=0.01,
            logging_dir='./logs',
            logging_steps=50,
            eval_strategy='epoch',  # Updated from evaluation_strategy for transformers 5.x
            save_strategy='no',           # Skip intermediate checkpoints (saves ~700MB/epoch)
            load_best_model_at_end=False, # Cannot load best without saved checkpoints
            dataloader_num_workers=0,
            fp16=False,  # Disable fp16 for MPS backend compatibility
            report_to=[],  # Disable wandb/tensorboard for now
        )
        
    def train_model(self):
        """Train the model"""
        print("🚀 Starting model training...")
        print(f"Timestamp: {datetime.now().isoformat()}")
        
        # Setup training arguments
        training_args = self.setup_training_arguments()
        
        # Initialize trainer
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=self.train_dataset,
            eval_dataset=self.test_dataset,
            data_collator=self.data_collator,
            compute_metrics=self.compute_metrics
        )
        
        # Start training
        trainer.train()
        
        # Evaluate on test set
        print("📊 Evaluating on test set...")
        eval_results = trainer.evaluate()
        
        print("\n" + "="*60)
        print("📊 FINAL EVALUATION RESULTS")
        print("="*60)
        print(f"Test Precision: {eval_results['eval_precision']:.4f}")
        print(f"Test Recall: {eval_results['eval_recall']:.4f}")
        print(f"Test F1 Score: {eval_results['eval_f1']:.4f}")
        print("="*60)
        
        # Get detailed predictions for per-entity analysis
        self.detailed_evaluation(trainer)
        
        return trainer, eval_results
        
    def detailed_evaluation(self, trainer):
        """Perform detailed evaluation with per-entity scores"""
        print("\n🔍 Computing per-entity F1 scores...")
        
        # Get predictions
        predictions = trainer.predict(self.test_dataset)
        y_pred = np.argmax(predictions.predictions, axis=2)
        y_true = predictions.label_ids
        
        # Remove ignored index (-100) and flatten
        true_predictions = []
        true_labels = []
        
        for pred_seq, true_seq in zip(y_pred, y_true):
            for pred, true in zip(pred_seq, true_seq):
                if true != -100:
                    true_predictions.append(pred)
                    true_labels.append(true)
        
        # Convert to label names
        pred_labels = [ID_TO_LABEL[pred] for pred in true_predictions]
        true_label_names = [ID_TO_LABEL[true] for true in true_labels]
        
        # Generate classification report
        report = classification_report(
            true_label_names, 
            pred_labels, 
            labels=LABELS,
            zero_division=0,
            output_dict=True
        )
        
        # Print per-entity results
        print("\n📈 Per-Entity F1 Scores:")
        print("-" * 40)
        
        # Note: PERSON removed - handled separately with regex
        entity_types = ['COMPANY', 'CLIENT', 'ROLE', 'LOCATION', 'START_DATE', 'END_DATE', 'EDUCATION', 'DEGREE']
        
        for entity in entity_types:
            b_entity = f'B-{entity}'
            i_entity = f'I-{entity}'
            
            if b_entity in report:
                f1_b = report[b_entity]['f1-score']
                support_b = report[b_entity]['support']
            else:
                f1_b = support_b = 0
                
            if i_entity in report:
                f1_i = report[i_entity]['f1-score']
                support_i = report[i_entity]['support']
            else:
                f1_i = support_i = 0
                
            total_support = support_b + support_i
            if total_support > 0:
                avg_f1 = (f1_b * support_b + f1_i * support_i) / total_support
            else:
                avg_f1 = 0.0
                
            print(f"{entity:8}: {avg_f1:.4f} (support: {int(total_support)})")
        
        print("-" * 40)
        
    def save_model(self, trainer):
        """Save the fine-tuned model using ModelLoader"""
        print(f"💾 Saving model to {FINAL_MODEL_DIR}...")
        
        # Use ModelLoader to save model
        loader = ModelLoader()
        loader.save_model(FINAL_MODEL_DIR, self.tokenizer, self.model)
        
        print(f"✅ Model saved to {FINAL_MODEL_DIR}")
        
    def train(self):
        """Main training pipeline"""
        print("🚀 Starting DeBERTa-v3 NER training pipeline")
        print(f"Model: microsoft/deberta-v3-base")
        print(f"Output directory: {OUTPUT_DIR}")
        print(f"Final model directory: {FINAL_MODEL_DIR}")
        print(f"Custom Labels: {len(LABELS)}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("="*60)
        
        try:
            # Load data
            train_data, test_data = self.load_data()
            
            # Initialize model and tokenizer
            self.initialize_model_and_tokenizer()
            
            # Prepare datasets
            self.prepare_datasets(train_data, test_data)
            
            # Train model
            trainer, eval_results = self.train_model()
            
            # Save model using ModelLoader
            self.save_model(trainer)
            
            print("\n🎉 Training completed successfully!")
            print(f"Final F1 Score: {eval_results['eval_f1']:.4f}")
            print(f"Model saved to: {FINAL_MODEL_DIR}")
            
        except Exception as e:
            print(f"❌ Training failed: {e}")
            import traceback
            traceback.print_exc()
            raise

def main():
    """Main function"""
    trainer = ResumeNERTrainer()
    trainer.train()

if __name__ == "__main__":
    main()
