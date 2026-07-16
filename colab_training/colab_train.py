#!/usr/bin/env python3
"""
Google Colab Training Script - Manual Labels Only
Upload this to Colab and run to train the model on GPU.
"""

import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Tuple
from collections import Counter
import random

# Install required packages
print("📦 Installing required packages...")
os.system("pip install -q transformers datasets torch scikit-learn accelerate")

from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification
)
from datasets import Dataset
import torch
import numpy as np
from sklearn.metrics import f1_score

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ColabTrainer:
    """Train DeBERTa NER model on Google Colab."""
    
    ENTITY_LABELS = [
        "O",
        "B-COMPANY", "I-COMPANY",
        "B-ROLE", "I-ROLE",
        "B-LOCATION", "I-LOCATION",
        "B-DATE_START", "I-DATE_START",
        "B-DATE_END", "I-DATE_END",
        "B-CLIENT", "I-CLIENT",
        "B-DEGREE", "I-DEGREE",
        "B-INSTITUTION", "I-INSTITUTION",
        "B-FIELD", "I-FIELD",
        "B-EDU_YEAR_START", "I-EDU_YEAR_START",
        "B-EDU_YEAR_END", "I-EDU_YEAR_END",
        "B-GRADE", "I-GRADE"
    ]
    
    def __init__(self):
        self.model_name = "microsoft/deberta-v3-base"
        self.output_dir = "trained_model"
        
        self.label2id = {label: idx for idx, label in enumerate(self.ENTITY_LABELS)}
        self.id2label = {idx: label for label, idx in self.label2id.items()}
        
        logger.info("=" * 80)
        logger.info("🎯 GOOGLE COLAB TRAINING - MANUAL LABELS ONLY")
        logger.info("=" * 80)
        logger.info(f"🤖 Model: {self.model_name}")
        logger.info(f"🏷️  Labels: {len(self.ENTITY_LABELS)}")
        logger.info(f"💾 Output: {self.output_dir}")
        logger.info("=" * 80)
    
    def load_manual_labels(self, data_files: List[str]) -> List[Dict]:
        """Load manual labels from JSON files."""
        logger.info("\n📂 Loading manual label files...")
        
        all_tasks = []
        for filepath in data_files:
            if not os.path.exists(filepath):
                logger.error(f"❌ File not found: {filepath}")
                continue
            
            logger.info(f"📄 Loading: {os.path.basename(filepath)}")
            
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            valid_tasks = [task for task in data if self._validate_task(task)]
            all_tasks.extend(valid_tasks)
            
            logger.info(f"   ✅ Loaded {len(valid_tasks):,} tasks")
        
        logger.info(f"\n✅ TOTAL: {len(all_tasks):,} manual labels loaded")
        self._show_statistics(all_tasks)
        
        return all_tasks
    
    def _validate_task(self, task: Dict) -> bool:
        """Validate task format."""
        return (
            isinstance(task, dict) and
            'text' in task and
            'label' in task and
            isinstance(task['text'], str) and
            isinstance(task['label'], list) and
            task['text'].strip()
        )
    
    def _show_statistics(self, tasks: List[Dict]):
        """Show dataset statistics."""
        label_counts = Counter()
        total_entities = 0
        
        for task in tasks:
            for label in task.get('label', []):
                if isinstance(label, dict) and 'labels' in label:
                    for label_type in label['labels']:
                        label_counts[label_type] += 1
                        total_entities += 1
        
        logger.info(f"\n📊 Dataset Statistics:")
        logger.info(f"   Tasks: {len(tasks):,}")
        logger.info(f"   Entities: {total_entities:,}")
        logger.info(f"   Avg per task: {total_entities / len(tasks):.1f}")
        
        logger.info(f"\n🏷️  Top Entity Types:")
        for label, count in sorted(label_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
            pct = (count / total_entities) * 100
            logger.info(f"   {label:20s}: {count:6,} ({pct:5.1f}%)")
    
    def convert_to_ner_format(self, tasks: List[Dict]) -> List[Dict]:
        """Convert Label Studio format to NER format."""
        logger.info("\n🔄 Converting to NER format...")
        
        ner_data = []
        skipped = 0
        
        for task in tasks:
            try:
                text = task['text']
                entities = []
                
                for label in task.get('label', []):
                    if isinstance(label, dict):
                        start = label.get('start')
                        end = label.get('end')
                        label_types = label.get('labels', [])
                        
                        if start is not None and end is not None and label_types:
                            if 0 <= start < end <= len(text):
                                entities.append({
                                    "start": start,
                                    "end": end,
                                    "label": label_types[0]
                                })
                            else:
                                skipped += 1
                
                if entities:
                    ner_data.append({"text": text, "entities": entities})
            
            except Exception as e:
                skipped += 1
        
        logger.info(f"✅ Converted {len(ner_data):,} tasks")
        if skipped > 0:
            logger.info(f"⚠️  Skipped {skipped:,} invalid entities")
        
        return ner_data
    
    def split_train_val(self, data: List[Dict], val_split: float = 0.15) -> Tuple[List[Dict], List[Dict]]:
        """Split into train and validation sets."""
        random.seed(42)
        shuffled = data.copy()
        random.shuffle(shuffled)
        
        val_size = int(len(shuffled) * val_split)
        val_data = shuffled[:val_size]
        train_data = shuffled[val_size:]
        
        logger.info(f"\n📊 Train/Val Split:")
        logger.info(f"   Training: {len(train_data):,} ({(1-val_split)*100:.0f}%)")
        logger.info(f"   Validation: {len(val_data):,} ({val_split*100:.0f}%)")
        
        return train_data, val_data
    
    def tokenize_and_align_labels(self, examples, tokenizer):
        """Tokenize and align labels."""
        tokenized_inputs = tokenizer(
            examples["text"],
            truncation=True,
            padding=False,
            max_length=512,
            is_split_into_words=False
        )
        
        labels = []
        for i, (text, entities) in enumerate(zip(examples["text"], examples["entities"])):
            word_ids = tokenized_inputs.word_ids(batch_index=i)
            label_ids = []
            
            # Create character-to-label mapping
            char_labels = ["O"] * len(text)
            for entity in entities:
                start, end = entity["start"], entity["end"]
                entity_type = entity["label"]
                if start < len(char_labels):
                    char_labels[start] = f"B-{entity_type}"
                for pos in range(start + 1, min(end, len(char_labels))):
                    char_labels[pos] = f"I-{entity_type}"
            
            # Align with tokens
            prev_word_idx = None
            for word_idx in word_ids:
                if word_idx is None:
                    label_ids.append(-100)
                elif word_idx != prev_word_idx:
                    # Get label for this character position
                    label = char_labels[min(word_idx, len(char_labels) - 1)]
                    label_ids.append(self.label2id.get(label, 0))
                else:
                    label_ids.append(-100)
                prev_word_idx = word_idx
            
            labels.append(label_ids)
        
        tokenized_inputs["labels"] = labels
        return tokenized_inputs
    
    def prepare_datasets(self, train_data, val_data, tokenizer):
        """Prepare HuggingFace datasets."""
        logger.info("\n📦 Preparing datasets...")
        
        train_dataset = Dataset.from_dict({
            "text": [item["text"] for item in train_data],
            "entities": [item["entities"] for item in train_data]
        })
        
        val_dataset = Dataset.from_dict({
            "text": [item["text"] for item in val_data],
            "entities": [item["entities"] for item in val_data]
        })
        
        train_dataset = train_dataset.map(
            lambda x: self.tokenize_and_align_labels(x, tokenizer),
            batched=True,
            remove_columns=["text", "entities"]
        )
        
        val_dataset = val_dataset.map(
            lambda x: self.tokenize_and_align_labels(x, tokenizer),
            batched=True,
            remove_columns=["text", "entities"]
        )
        
        logger.info(f"✅ Train: {len(train_dataset)} examples")
        logger.info(f"✅ Val: {len(val_dataset)} examples")
        
        return train_dataset, val_dataset
    
    def compute_metrics(self, eval_pred):
        """Compute F1 score."""
        predictions, labels = eval_pred
        predictions = np.argmax(predictions, axis=2)
        
        true_labels = [[self.id2label[l] for l in label if l != -100] for label in labels]
        true_predictions = [
            [self.id2label[p] for (p, l) in zip(prediction, label) if l != -100]
            for prediction, label in zip(predictions, labels)
        ]
        
        flat_true = [label for sublist in true_labels for label in sublist]
        flat_pred = [label for sublist in true_predictions for label in sublist]
        
        f1 = f1_score(flat_true, flat_pred, average='weighted', zero_division=0)
        
        return {"f1": f1}
    
    def train(self, train_dataset, val_dataset, tokenizer):
        """Train the model."""
        logger.info("\n🚀 Starting training...")
        
        # Check GPU
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"🖥️  Device: {device}")
        
        # Load model
        model = AutoModelForTokenClassification.from_pretrained(
            self.model_name,
            num_labels=len(self.ENTITY_LABELS),
            id2label=self.id2label,
            label2id=self.label2id
        )
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=self.output_dir,
            evaluation_strategy="epoch",
            save_strategy="epoch",
            learning_rate=2e-5,
            per_device_train_batch_size=16,
            per_device_eval_batch_size=16,
            num_train_epochs=5,
            weight_decay=0.01,
            logging_steps=100,
            save_total_limit=2,
            load_best_model_at_end=True,
            metric_for_best_model="f1",
            greater_is_better=True,
            fp16=torch.cuda.is_available(),
            report_to=["tensorboard"],
        )
        
        # Data collator
        data_collator = DataCollatorForTokenClassification(tokenizer)
        
        # Trainer
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=val_dataset,
            tokenizer=tokenizer,
            data_collator=data_collator,
            compute_metrics=self.compute_metrics
        )
        
        # Train
        logger.info("🏋️ Training...")
        trainer.train()
        
        # Save
        logger.info(f"\n💾 Saving to {self.output_dir}")
        trainer.save_model()
        tokenizer.save_pretrained(self.output_dir)
        
        # Save metadata
        with open(f"{self.output_dir}/training_info.json", "w") as f:
            json.dump({
                "model_name": self.model_name,
                "train_samples": len(train_dataset),
                "val_samples": len(val_dataset),
                "num_labels": len(self.ENTITY_LABELS),
                "labels": self.ENTITY_LABELS,
                "data_source": "manual_labels_only"
            }, f, indent=2)
        
        # Final evaluation
        logger.info("\n📊 Final Evaluation:")
        eval_results = trainer.evaluate()
        logger.info(f"   F1 Score: {eval_results['eval_f1']:.4f}")
        logger.info(f"   Loss: {eval_results['eval_loss']:.4f}")
        
        logger.info("\n✅ Training complete!")
        
        return trainer


def main():
    """Main training pipeline for Google Colab."""
    print("\n" + "=" * 80)
    print("🎯 GOOGLE COLAB TRAINING - MANUAL LABELS ONLY")
    print("=" * 80)
    
    # Step 1: Specify your data files
    # IMPORTANT: Upload your 3 JSON files to Colab first!
    data_files = [
        "labelfiledata.json",
        "labelfiledata1.json",
        "labelfiledata2.json"
    ]
    
    print("\n📋 Checking for data files...")
    missing_files = [f for f in data_files if not os.path.exists(f)]
    if missing_files:
        print("\n❌ ERROR: Missing data files!")
        print("Please upload these files to Colab:")
        for f in missing_files:
            print(f"   - {f}")
        print("\nTo upload: Click folder icon → Upload files")
        return
    
    print("✅ All data files found!")
    
    # Step 2: Initialize trainer
    trainer_obj = ColabTrainer()
    
    # Step 3: Load manual labels
    tasks = trainer_obj.load_manual_labels(data_files)
    
    if not tasks:
        print("❌ No data loaded!")
        return
    
    # Step 4: Convert to NER format
    ner_data = trainer_obj.convert_to_ner_format(tasks)
    
    # Step 5: Split train/val
    train_data, val_data = trainer_obj.split_train_val(ner_data)
    
    # Step 6: Load tokenizer
    print(f"\n📥 Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(trainer_obj.model_name)
    
    # Step 7: Prepare datasets
    train_dataset, val_dataset = trainer_obj.prepare_datasets(train_data, val_data, tokenizer)
    
    # Step 8: Train
    trainer = trainer_obj.train(train_dataset, val_dataset, tokenizer)
    
    # Step 9: Download model
    print("\n" + "=" * 80)
    print("✅ TRAINING COMPLETE!")
    print("=" * 80)
    print(f"\n📁 Model saved to: {trainer_obj.output_dir}/")
    print("\n📥 To download:")
    print("   1. Click folder icon on left")
    print(f"   2. Right-click '{trainer_obj.output_dir}' folder")
    print("   3. Select 'Download'")
    print("\n🚀 You can now use this model in your application!")


if __name__ == "__main__":
    main()
