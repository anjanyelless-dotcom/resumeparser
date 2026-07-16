#!/usr/bin/env python3
"""
Standalone training script for DeBERTa-v3 on resume NER task.
Works in Google Colab without external dependencies.
"""

import os
import json
import numpy as np
from typing import List, Dict, Any
from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification
)
from sklearn.metrics import precision_recall_fscore_support, classification_report
import torch
from datetime import datetime

# Label definitions
LABELS = [
    'O',
    'B-COMPANY', 'I-COMPANY',
    'B-CLIENT', 'I-CLIENT',
    'B-ROLE', 'I-ROLE',
    'B-LOCATION', 'I-LOCATION',
    'B-START_DATE', 'I-START_DATE',
    'B-END_DATE', 'I-END_DATE',
    'B-EDUCATION', 'I-EDUCATION',
    'B-DEGREE', 'I-DEGREE',
    'B-FIELD', 'I-FIELD',
    'B-INSTITUTION', 'I-INSTITUTION',
    'B-GRADE', 'I-GRADE',
    'B-EDU_START_YEAR', 'I-EDU_START_YEAR',
    'B-EDU_END_YEAR', 'I-EDU_END_YEAR',
    'B-PERSON_NAME', 'I-PERSON_NAME',
    'B-FEILD', 'I-FEILD'
]

LABEL_TO_ID = {label: idx for idx, label in enumerate(LABELS)}
ID_TO_LABEL = {idx: label for idx, label in enumerate(LABELS)}

# Configuration
OUTPUT_DIR = './training/checkpoints'
FINAL_MODEL_DIR = './models/resume-ner-deberta'
DATA_DIR = './training/data'

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
        
        train_path = os.path.join(DATA_DIR, 'train.json')
        with open(train_path, 'r', encoding='utf-8') as f:
            train_data = json.load(f)
            
        test_path = os.path.join(DATA_DIR, 'test.json')
        with open(test_path, 'r', encoding='utf-8') as f:
            test_data = json.load(f)
            
        print(f"✅ Loaded {len(train_data)} training examples")
        print(f"✅ Loaded {len(test_data)} test examples")
        
        return train_data, test_data
        
    def initialize_model_and_tokenizer(self):
        """Initialize DeBERTa-v3 model and tokenizer"""
        print("🤖 Initializing DeBERTa-v3 model and tokenizer...")
        
        model_name = "microsoft/deberta-v3-base"
        
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForTokenClassification.from_pretrained(
            model_name,
            num_labels=len(LABELS),
            id2label=ID_TO_LABEL,
            label2id=LABEL_TO_ID,
            ignore_mismatched_sizes=True
        )
        
        self.data_collator = DataCollatorForTokenClassification(
            tokenizer=self.tokenizer,
            padding=True
        )
        
        print(f"✅ Model initialized with {len(LABELS)} labels")
        print(f"   Labels: {', '.join(LABELS[:10])}...")
        
    def tokenize_and_align_labels(self, examples: List[Dict]) -> Dict:
        """Tokenize text and align NER labels with tokenized inputs"""
        tokenized_inputs = self.tokenizer(
            examples['tokens'],
            truncation=True,
            padding=True,
            is_split_into_words=True,
            max_length=512
        )
        
        labels = []
        for i, label_list in enumerate(examples['labels']):
            word_ids = tokenized_inputs.word_ids(batch_index=i)
            label_ids = []
            previous_word_idx = None
            
            for word_idx in word_ids:
                if word_idx is None:
                    label_ids.append(-100)
                elif word_idx != previous_word_idx:
                    label_id = LABEL_TO_ID.get(label_list[word_idx], LABEL_TO_ID['O'])
                    label_ids.append(label_id)
                else:
                    label_ids.append(-100)
                previous_word_idx = word_idx
                
            labels.append(label_ids)
        
        tokenized_inputs["labels"] = labels
        return tokenized_inputs
        
    def prepare_datasets(self, train_data: List[Dict], test_data: List[Dict]):
        """Convert data to HuggingFace Dataset format"""
        print("🔄 Preparing datasets...")
        
        train_dict = {
            'tokens': [ex['tokens'] for ex in train_data],
            'labels': [ex['labels'] for ex in train_data]
        }
        test_dict = {
            'tokens': [ex['tokens'] for ex in test_data],
            'labels': [ex['labels'] for ex in test_data]
        }
        
        train_dataset = Dataset.from_dict(train_dict)
        test_dataset = Dataset.from_dict(test_dict)
        
        self.train_dataset = train_dataset.map(
            self.tokenize_and_align_labels,
            batched=True,
            remove_columns=train_dataset.column_names
        )
        
        self.test_dataset = test_dataset.map(
            self.tokenize_and_align_labels,
            batched=True,
            remove_columns=test_dataset.column_names
        )
        
        print(f"✅ Prepared {len(self.train_dataset)} training samples")
        print(f"✅ Prepared {len(self.test_dataset)} test samples")
        
    def compute_metrics(self, pred):
        """Compute precision, recall, F1 for evaluation"""
        predictions, labels = pred
        predictions = np.argmax(predictions, axis=2)
        
        true_predictions = []
        true_labels = []
        
        for prediction, label in zip(predictions, labels):
            for pred_id, label_id in zip(prediction, label):
                if label_id != -100:
                    true_predictions.append(ID_TO_LABEL[pred_id])
                    true_labels.append(ID_TO_LABEL[label_id])
        
        precision, recall, f1, _ = precision_recall_fscore_support(
            true_labels, 
            true_predictions, 
            average='weighted',
            zero_division=0
        )
        
        return {
            'precision': precision,
            'recall': recall,
            'f1': f1
        }
        
    def train(self):
        """Train the model"""
        print("🚀 Starting training...")
        
        training_args = TrainingArguments(
            output_dir=OUTPUT_DIR,
            eval_strategy="epoch",
            save_strategy="epoch",
            learning_rate=2e-5,
            per_device_train_batch_size=16,
            per_device_eval_batch_size=16,
            num_train_epochs=3,
            weight_decay=0.01,
            logging_dir='./logs',
            logging_steps=100,
            load_best_model_at_end=True,
            metric_for_best_model='f1',
            save_total_limit=2,
            fp16=torch.cuda.is_available(),
            report_to="none"
        )
        
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=self.train_dataset,
            eval_dataset=self.test_dataset,
            tokenizer=self.tokenizer,
            data_collator=self.data_collator,
            compute_metrics=self.compute_metrics
        )
        
        print(f"📊 Training configuration:")
        print(f"   - Epochs: {training_args.num_train_epochs}")
        print(f"   - Batch size: {training_args.per_device_train_batch_size}")
        print(f"   - Learning rate: {training_args.learning_rate}")
        print(f"   - FP16: {training_args.fp16}")
        
        trainer.train()
        
        print("✅ Training complete!")
        
        eval_results = trainer.evaluate()
        print(f"\n📊 Final evaluation results:")
        print(f"   - Precision: {eval_results['eval_precision']:.4f}")
        print(f"   - Recall: {eval_results['eval_recall']:.4f}")
        print(f"   - F1 Score: {eval_results['eval_f1']:.4f}")
        
        return trainer
        
    def save_model(self, trainer):
        """Save the final model"""
        print(f"💾 Saving model to {FINAL_MODEL_DIR}...")
        
        os.makedirs(FINAL_MODEL_DIR, exist_ok=True)
        
        trainer.save_model(FINAL_MODEL_DIR)
        self.tokenizer.save_pretrained(FINAL_MODEL_DIR)
        
        with open(os.path.join(FINAL_MODEL_DIR, 'label_mappings.json'), 'w') as f:
            json.dump({
                'labels': LABELS,
                'label_to_id': LABEL_TO_ID,
                'id_to_label': ID_TO_LABEL
            }, f, indent=2)
        
        print(f"✅ Model saved successfully!")
        print(f"   Location: {FINAL_MODEL_DIR}")

def main():
    print("="*60)
    print("🎯 Resume NER Training with DeBERTa-v3")
    print("="*60)
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Device: {'GPU' if torch.cuda.is_available() else 'CPU'}")
    print("="*60 + "\n")
    
    trainer_obj = ResumeNERTrainer()
    
    train_data, test_data = trainer_obj.load_data()
    
    trainer_obj.initialize_model_and_tokenizer()
    
    trainer_obj.prepare_datasets(train_data, test_data)
    
    trainer = trainer_obj.train()
    
    trainer_obj.save_model(trainer)
    
    print("\n" + "="*60)
    print("🎉 Training pipeline completed successfully!")
    print(f"End time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

if __name__ == "__main__":
    main()
