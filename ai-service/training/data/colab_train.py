#!/usr/bin/env python3
"""
Resume NER Model Training Script - Optimized for Google Colab
Fine-tunes DeBERTa-v3-base on resume entity recognition task.
"""

import json
import torch
import numpy as np
from pathlib import Path
from datetime import datetime
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification
)
from datasets import Dataset
from sklearn.metrics import precision_recall_fscore_support

MODEL_NAME = "microsoft/deberta-v3-base"
# Save model to the correct location
OUTPUT_DIR = str(Path(__file__).parent.parent.parent / "models" / "resume-ner-deberta")

# All labels from the training data (label1.json, label2.json, label3.json)
LABELS = [
    "O",
    "B-COMPANY", "I-COMPANY",
    "B-CLIENT", "I-CLIENT",
    "B-ROLE", "I-ROLE",
    "B-LOCATION", "I-LOCATION",
    "B-DATE_START", "I-DATE_START",
    "B-DATE_END", "I-DATE_END",
    "B-INSTITUTION", "I-INSTITUTION",
    "B-DEGREE", "I-DEGREE",
    "B-FIELD", "I-FIELD",
    "B-EDU_YEAR_START", "I-EDU_YEAR_START",
    "B-EDU_YEAR_END", "I-EDU_YEAR_END",
    "B-GRADE", "I-GRADE",
    "B-PERSON_NAME", "I-PERSON_NAME"
]

label2id = {label: i for i, label in enumerate(LABELS)}
id2label = {i: label for i, label in enumerate(LABELS)}

class ResumeNERTrainer:
    def __init__(self):
        # Auto-detect GPU (CUDA for Colab)
        if torch.cuda.is_available():
            self.device = "cuda"
            print("="*50)
            print("🎯 Resume NER Model Training (Colab Version)")
            print("="*50)
            print(f"✅ GPU Available: {torch.cuda.get_device_name(0)}")
            print(f"🖥️  Using device: {self.device}")
        else:
            self.device = "cpu"
            print("="*50)
            print("🎯 Resume NER Model Training (Colab Version)")
            print("="*50)
            print("⚠️  No GPU detected - using CPU")
            print(f"🖥️  Using device: {self.device}")
        
        self.tokenizer = None
        self.model = None
        self.train_dataset = None
        self.test_dataset = None
        self.data_collator = None
        
    def load_data(self, train_file: str = None, test_file: str = None):
        """Load training and test data"""
        # Default to files in the same directory as this script
        if train_file is None:
            script_dir = Path(__file__).parent
            train_file = script_dir / "train.json"
        if test_file is None:
            script_dir = Path(__file__).parent
            test_file = script_dir / "test.json"
            
        print(f"📂 Loading data from {train_file} and {test_file}...")
        
        with open(train_file, 'r') as f:
            train_data = json.load(f)
        
        with open(test_file, 'r') as f:
            test_data = json.load(f)
        
        print(f"✅ Loaded {len(train_data)} train and {len(test_data)} test examples")
        return train_data, test_data
    
    def load_model_and_tokenizer(self):
        """Load pre-trained model and tokenizer"""
        print(f"🤖 Loading model and tokenizer: {MODEL_NAME}")
        
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        
        self.model = AutoModelForTokenClassification.from_pretrained(
            MODEL_NAME,
            num_labels=len(LABELS),
            id2label=id2label,
            label2id=label2id,
            ignore_mismatched_sizes=True
        )
        
        print(f"✅ Model initialized with {len(LABELS)} labels")
        
    def tokenize_and_align_labels(self, examples):
        """Tokenize inputs and align labels with tokenized inputs"""
        tokenized_inputs = self.tokenizer(
            examples["tokens"],
            truncation=True,
            is_split_into_words=True,
            max_length=256,
            padding=False
        )
        
        labels = []
        for i, label in enumerate(examples["labels"]):
            word_ids = tokenized_inputs.word_ids(batch_index=i)
            label_ids = []
            previous_word_idx = None
            
            for word_idx in word_ids:
                if word_idx is None:
                    label_ids.append(-100)
                elif word_idx != previous_word_idx:
                    # Convert string label to ID
                    label_str = label[word_idx]
                    label_id = label2id.get(label_str, 0)  # Default to 'O' if not found
                    label_ids.append(label_id)
                else:
                    label_ids.append(-100)
                previous_word_idx = word_idx
            
            labels.append(label_ids)
        
        tokenized_inputs["labels"] = labels
        return tokenized_inputs
    
    def prepare_datasets(self, train_data, test_data):
        """Convert data to HuggingFace Dataset format"""
        print("🔧 Preparing datasets...")
        
        train_dataset = Dataset.from_list(train_data)
        test_dataset = Dataset.from_list(test_data)
        
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
        
        self.data_collator = DataCollatorForTokenClassification(
            tokenizer=self.tokenizer,
            padding=True
        )
        
        print(f"✅ Datasets prepared with {len(self.train_dataset)} train and {len(self.test_dataset)} test examples")
    
    def compute_metrics(self, eval_pred):
        """Compute precision, recall, and F1 score"""
        predictions, labels = eval_pred
        predictions = np.argmax(predictions, axis=2)
        
        true_predictions = []
        true_labels = []
        
        for prediction, label in zip(predictions, labels):
            for pred_id, label_id in zip(prediction, label):
                if label_id != -100:
                    true_predictions.append(pred_id)
                    true_labels.append(label_id)
        
        precision, recall, f1, _ = precision_recall_fscore_support(
            true_labels, 
            true_predictions, 
            average='weighted',
            zero_division=0
        )
        
        return {
            "precision": float(precision),
            "recall": float(recall),
            "f1": float(f1)
        }
        
    def setup_training_arguments(self) -> TrainingArguments:
        """Setup training arguments optimized for high F1 score"""
        return TrainingArguments(
            output_dir=OUTPUT_DIR,
            num_train_epochs=10,
            learning_rate=2e-5,
            per_device_train_batch_size=16,
            per_device_eval_batch_size=16,
            gradient_accumulation_steps=1,
            warmup_steps=500,
            weight_decay=0.01,
            logging_dir='./logs',
            logging_steps=50,
            eval_strategy='epoch',
            save_strategy='epoch',
            load_best_model_at_end=True,
            metric_for_best_model='f1',
            greater_is_better=True,
            dataloader_num_workers=2,
            bf16=torch.cuda.is_available(),
            report_to=[],
            save_total_limit=3,
            lr_scheduler_type='linear',
            max_grad_norm=1.0,
        )
        
    def train_model(self):
        """Train the model"""
        print("🚀 Starting model training...")
        print(f"Timestamp: {datetime.now().isoformat()}")
        
        training_args = self.setup_training_arguments()
        
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=self.train_dataset,
            eval_dataset=self.test_dataset,
            data_collator=self.data_collator,
            compute_metrics=self.compute_metrics,
        )
        
        trainer.train()
        
        print("📊 Evaluating on test set...")
        eval_results = trainer.evaluate()
        
        return trainer, eval_results
    
    def train(self):
        """Main training pipeline"""
        try:
            train_data, test_data = self.load_data()
            self.load_model_and_tokenizer()
            self.prepare_datasets(train_data, test_data)
            trainer, eval_results = self.train_model()
            
            print("\n" + "="*50)
            print("📊 Final Evaluation Results:")
            print("="*50)
            for key, value in eval_results.items():
                print(f"{key}: {value:.4f}")
            print("="*50)
            
            print("\n💾 Saving model to", OUTPUT_DIR)
            trainer.save_model(OUTPUT_DIR)
            self.tokenizer.save_pretrained(OUTPUT_DIR)
            print("✅ Model saved successfully!")
            
            print("\n✅ Training completed successfully!")
            
        except Exception as e:
            print(f"❌ Training failed: {e}")
            import traceback
            traceback.print_exc()
            raise

def main():
    """Main entry point"""
    trainer = ResumeNERTrainer()
    trainer.train()

if __name__ == "__main__":
    main()
