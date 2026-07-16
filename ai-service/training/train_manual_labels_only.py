#!/usr/bin/env python3
"""
Train DeBERTa NER Model - MANUAL LABELS ONLY
Completely ignores synthetic/auto-generated labels.
Uses ONLY the 3 manually verified Label Studio files.
"""

import os
import sys
import json
import logging
import shutil
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from manual_label_loader import ManualLabelLoader

# Transformers imports
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
from sklearn.metrics import classification_report, f1_score

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ManualLabelTrainer:
    """
    Trains DeBERTa model using ONLY manually labeled data.
    Ignores all synthetic labels completely.
    """
    
    # Entity labels for NER
    ENTITY_LABELS = [
        "O",  # Outside any entity
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
    
    def __init__(self, output_dir: str = "training/output_manual_only"):
        self.output_dir = Path(output_dir)
        self.model_name = "microsoft/deberta-v3-base"
        
        # Create label mappings
        self.label2id = {label: idx for idx, label in enumerate(self.ENTITY_LABELS)}
        self.id2label = {idx: label for label, idx in self.label2id.items()}
        
        logger.info("=" * 80)
        logger.info("🎯 MANUAL LABEL TRAINING - CLEAN MODE")
        logger.info("=" * 80)
        logger.info(f"📁 Output directory: {self.output_dir}")
        logger.info(f"🤖 Base model: {self.model_name}")
        logger.info(f"🏷️  Entity labels: {len(self.ENTITY_LABELS)}")
        logger.info("=" * 80)
    
    def clear_old_artifacts(self):
        """Clear old training artifacts to start fresh."""
        logger.info("\n🧹 Clearing old training artifacts...")
        
        dirs_to_clear = [
            self.output_dir,
            Path("training/cache"),
            Path("training/logs"),
        ]
        
        for dir_path in dirs_to_clear:
            if dir_path.exists():
                logger.info(f"   Removing: {dir_path}")
                shutil.rmtree(dir_path)
        
        logger.info("✅ Old artifacts cleared")
    
    def tokenize_and_align_labels(self, examples, tokenizer):
        """
        Tokenize text and align entity labels with tokens.
        """
        tokenized_inputs = tokenizer(
            examples["text"],
            truncation=True,
            padding=False,
            max_length=512,
            is_split_into_words=False
        )
        
        labels = []
        for i, entities in enumerate(examples["entities"]):
            word_ids = tokenized_inputs.word_ids(batch_index=i)
            label_ids = []
            
            for word_idx in word_ids:
                if word_idx is None:
                    label_ids.append(-100)  # Special tokens
                else:
                    # Find if this character position is in any entity
                    char_pos = word_idx
                    label = "O"
                    
                    for entity in entities:
                        if entity["start"] <= char_pos < entity["end"]:
                            entity_type = entity["label"]
                            # Use B- prefix for first token, I- for rest
                            prefix = "B-" if char_pos == entity["start"] else "I-"
                            label = f"{prefix}{entity_type}"
                            break
                    
                    label_ids.append(self.label2id.get(label, 0))
            
            labels.append(label_ids)
        
        tokenized_inputs["labels"] = labels
        return tokenized_inputs
    
    def prepare_datasets(self, train_data, val_data, tokenizer):
        """Convert NER data to HuggingFace datasets."""
        logger.info("\n📦 Preparing datasets...")
        
        # Convert to HuggingFace format
        train_dataset = Dataset.from_dict({
            "text": [item["text"] for item in train_data],
            "entities": [item["entities"] for item in train_data]
        })
        
        val_dataset = Dataset.from_dict({
            "text": [item["text"] for item in val_data],
            "entities": [item["entities"] for item in val_data]
        })
        
        # Tokenize
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
        
        logger.info(f"✅ Train dataset: {len(train_dataset)} examples")
        logger.info(f"✅ Val dataset: {len(val_dataset)} examples")
        
        return train_dataset, val_dataset
    
    def compute_metrics(self, eval_pred):
        """Compute F1 score and other metrics."""
        predictions, labels = eval_pred
        predictions = np.argmax(predictions, axis=2)
        
        # Remove ignored index (special tokens)
        true_labels = [[self.id2label[l] for l in label if l != -100] for label in labels]
        true_predictions = [
            [self.id2label[p] for (p, l) in zip(prediction, label) if l != -100]
            for prediction, label in zip(predictions, labels)
        ]
        
        # Flatten
        flat_true = [label for sublist in true_labels for label in sublist]
        flat_pred = [label for sublist in true_predictions for label in sublist]
        
        # Calculate F1
        f1 = f1_score(flat_true, flat_pred, average='weighted', zero_division=0)
        
        return {
            "f1": f1,
            "precision": f1_score(flat_true, flat_pred, average='weighted', zero_division=0),
            "recall": f1_score(flat_true, flat_pred, average='weighted', zero_division=0)
        }
    
    def train(self, train_dataset, val_dataset, tokenizer):
        """Train the model."""
        logger.info("\n🚀 Starting training...")
        
        # Load model
        model = AutoModelForTokenClassification.from_pretrained(
            self.model_name,
            num_labels=len(self.ENTITY_LABELS),
            id2label=self.id2label,
            label2id=self.label2id
        )
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=str(self.output_dir),
            evaluation_strategy="epoch",
            save_strategy="epoch",
            learning_rate=2e-5,
            per_device_train_batch_size=16,
            per_device_eval_batch_size=16,
            num_train_epochs=5,
            weight_decay=0.01,
            logging_dir=str(self.output_dir / "logs"),
            logging_steps=100,
            save_total_limit=2,
            load_best_model_at_end=True,
            metric_for_best_model="f1",
            greater_is_better=True,
            push_to_hub=False,
            report_to=["tensorboard"],
            fp16=torch.cuda.is_available(),
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
        logger.info("🏋️ Training model...")
        train_result = trainer.train()
        
        # Save model
        logger.info(f"\n💾 Saving model to {self.output_dir}")
        trainer.save_model()
        tokenizer.save_pretrained(self.output_dir)
        
        # Save training info
        with open(self.output_dir / "training_info.json", "w") as f:
            json.dump({
                "model_name": self.model_name,
                "training_date": datetime.now().isoformat(),
                "train_samples": len(train_dataset),
                "val_samples": len(val_dataset),
                "num_labels": len(self.ENTITY_LABELS),
                "labels": self.ENTITY_LABELS,
                "data_source": "manual_labels_only",
                "files_used": ManualLabelLoader.MANUAL_LABEL_FILES
            }, f, indent=2)
        
        logger.info("✅ Training complete!")
        
        return trainer, train_result


def main():
    """Main training pipeline."""
    logger.info("\n" + "=" * 80)
    logger.info("🎯 STARTING MANUAL LABEL TRAINING PIPELINE")
    logger.info("=" * 80)
    
    # Step 1: Load manual labels ONLY
    loader = ManualLabelLoader()
    tasks = loader.load_all_manual_labels()
    
    if not tasks:
        logger.error("❌ No manual labels loaded! Exiting.")
        return
    
    # Step 2: Convert to NER format
    ner_data = loader.convert_to_ner_format(tasks)
    
    # Step 3: Split train/val
    train_data, val_data = loader.split_train_val(ner_data, val_split=0.15)
    
    # Step 4: Initialize trainer
    trainer_obj = ManualLabelTrainer()
    
    # Step 5: Clear old artifacts
    trainer_obj.clear_old_artifacts()
    
    # Step 6: Load tokenizer
    logger.info(f"\n📥 Loading tokenizer: {trainer_obj.model_name}")
    tokenizer = AutoTokenizer.from_pretrained(trainer_obj.model_name)
    
    # Step 7: Prepare datasets
    train_dataset, val_dataset = trainer_obj.prepare_datasets(train_data, val_data, tokenizer)
    
    # Step 8: Train
    trainer, train_result = trainer_obj.train(train_dataset, val_dataset, tokenizer)
    
    # Step 9: Final evaluation
    logger.info("\n📊 Final Evaluation:")
    eval_results = trainer.evaluate()
    logger.info(f"   F1 Score: {eval_results['eval_f1']:.4f}")
    logger.info(f"   Loss: {eval_results['eval_loss']:.4f}")
    
    logger.info("\n" + "=" * 80)
    logger.info("✅ TRAINING PIPELINE COMPLETE!")
    logger.info(f"📁 Model saved to: {trainer_obj.output_dir}")
    logger.info("=" * 80)


if __name__ == "__main__":
    main()
