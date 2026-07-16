#!/usr/bin/env python3
"""
Train DeBERTa model with class weights to fix I- tag prediction
This addresses the issue where model predicts all B- tags
"""

import json
import torch
import numpy as np
from pathlib import Path
from collections import Counter
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification
)
from torch.nn import CrossEntropyLoss
import evaluate

# Paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR.parent / "models" / "resume-ner-deberta-weighted"
MODEL_NAME = "microsoft/deberta-v3-base"

# Training configuration
CONFIG = {
    "num_train_epochs": 15,  # Increased from 8
    "learning_rate": 2e-5,
    "per_device_train_batch_size": 8,
    "per_device_eval_batch_size": 16,
    "warmup_steps": 1000,  # Increased from 500
    "weight_decay": 0.01,
    "i_tag_weight": 2.0,  # Give I- tags 2x weight
    "max_length": 1024,
}

def load_conll_data():
    """Load CoNLL format data"""
    print("\n📂 Loading training data...")
    
    train_file = DATA_DIR / "dataset_train.conll"
    test_file = DATA_DIR / "dataset_test.conll"
    
    if not train_file.exists():
        raise FileNotFoundError(f"Training file not found: {train_file}")
    if not test_file.exists():
        raise FileNotFoundError(f"Test file not found: {test_file}")
    
    # Load using datasets library
    data_files = {
        "train": str(train_file),
        "test": str(test_file)
    }
    
    dataset = load_dataset("conll2003", data_files=data_files)
    
    print(f"   Train samples: {len(dataset['train']):,}")
    print(f"   Test samples: {len(dataset['test']):,}")
    
    return dataset

def get_label_mappings(dataset):
    """Extract unique labels from dataset"""
    print("\n🏷️  Extracting labels...")
    
    labels = set()
    for split in dataset.values():
        for example in split:
            labels.update(example['ner_tags'])
    
    # Sort labels: O first, then B- tags, then I- tags
    label_list = sorted(labels, key=lambda x: (
        0 if x == 'O' else 1 if x.startswith('B-') else 2,
        x
    ))
    
    label2id = {label: idx for idx, label in enumerate(label_list)}
    id2label = {idx: label for label, idx in label2id.items()}
    
    print(f"   Total labels: {len(label_list)}")
    print(f"   Labels: {label_list[:10]}...")
    
    return label_list, label2id, id2label

def compute_class_weights(dataset, label2id, id2label, i_tag_weight=2.0):
    """
    Compute class weights to address I- tag prediction issue
    Give I- tags higher weight to force model to learn them
    """
    print(f"\n⚖️  Computing class weights (I- tag weight: {i_tag_weight}x)...")
    
    # Count label occurrences
    label_counts = Counter()
    total_tokens = 0
    
    for example in dataset['train']:
        for label_str in example['ner_tags']:
            label_id = label2id[label_str]
            label_counts[label_id] += 1
            total_tokens += 1
    
    # Create weights array
    num_labels = len(label2id)
    weights = torch.ones(num_labels)
    
    # Apply higher weight to I- tags
    b_tag_count = 0
    i_tag_count = 0
    
    for label_id, label_name in id2label.items():
        count = label_counts.get(label_id, 1)
        
        if label_name.startswith('I-'):
            weights[label_id] = i_tag_weight
            i_tag_count += count
        elif label_name.startswith('B-'):
            weights[label_id] = 1.0
            b_tag_count += count
        else:  # O tag
            weights[label_id] = 1.0
    
    print(f"   B- tags: {b_tag_count:,} tokens")
    print(f"   I- tags: {i_tag_count:,} tokens")
    print(f"   I/B ratio: {i_tag_count/b_tag_count:.2f}")
    print(f"   Applied {i_tag_weight}x weight to I- tags")
    
    # Show weight distribution
    print(f"\n   Weight distribution:")
    for label_id in range(min(10, num_labels)):
        label_name = id2label[label_id]
        weight = weights[label_id].item()
        count = label_counts.get(label_id, 0)
        print(f"      {label_name:20s}: weight={weight:.1f}, count={count:,}")
    
    return weights

def tokenize_and_align_labels(examples, tokenizer, label2id, max_length=1024):
    """Tokenize and align labels"""
    tokenized_inputs = tokenizer(
        examples["tokens"],
        truncation=True,
        is_split_into_words=True,
        max_length=max_length,
        padding=False
    )
    
    labels = []
    for i, label in enumerate(examples["ner_tags"]):
        word_ids = tokenized_inputs.word_ids(batch_index=i)
        previous_word_idx = None
        label_ids = []
        
        for word_idx in word_ids:
            if word_idx is None:
                label_ids.append(-100)
            elif word_idx != previous_word_idx:
                label_ids.append(label2id[label[word_idx]])
            else:
                label_ids.append(-100)
            previous_word_idx = word_idx
        
        labels.append(label_ids)
    
    tokenized_inputs["labels"] = labels
    return tokenized_inputs

def compute_metrics(eval_pred, id2label):
    """Compute F1, precision, recall"""
    metric = evaluate.load("seqeval")
    
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=2)
    
    true_labels = []
    true_predictions = []
    
    for prediction, label in zip(predictions, labels):
        true_label = []
        true_prediction = []
        
        for pred_id, label_id in zip(prediction, label):
            if label_id != -100:
                true_label.append(id2label[label_id])
                true_prediction.append(id2label[pred_id])
        
        true_labels.append(true_label)
        true_predictions.append(true_prediction)
    
    results = metric.compute(predictions=true_predictions, references=true_labels)
    
    return {
        "precision": results["overall_precision"],
        "recall": results["overall_recall"],
        "f1": results["overall_f1"],
        "accuracy": results["overall_accuracy"],
    }

class WeightedTrainer(Trainer):
    """Custom trainer with class weights"""
    
    def __init__(self, *args, class_weights=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.class_weights = class_weights
    
    def compute_loss(self, model, inputs, return_outputs=False):
        """Override loss computation to use class weights"""
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        logits = outputs.logits
        
        # Use weighted cross entropy loss
        loss_fct = CrossEntropyLoss(
            weight=self.class_weights.to(logits.device) if self.class_weights is not None else None,
            ignore_index=-100
        )
        
        loss = loss_fct(logits.view(-1, self.model.config.num_labels), labels.view(-1))
        
        return (loss, outputs) if return_outputs else loss

def main():
    print("=" * 80)
    print("DEBERTA TRAINING WITH CLASS WEIGHTS")
    print("=" * 80)
    print(f"\n📋 Configuration:")
    for key, value in CONFIG.items():
        print(f"   {key}: {value}")
    
    # Load data
    dataset = load_conll_data()
    
    # Get labels
    label_list, label2id, id2label = get_label_mappings(dataset)
    
    # Compute class weights
    class_weights = compute_class_weights(
        dataset,
        label2id,
        id2label,
        i_tag_weight=CONFIG["i_tag_weight"]
    )
    
    # Load tokenizer
    print(f"\n🔤 Loading tokenizer: {MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    
    # Tokenize dataset
    print("\n⚙️  Tokenizing dataset...")
    tokenized_dataset = dataset.map(
        lambda examples: tokenize_and_align_labels(
            examples,
            tokenizer,
            label2id,
            max_length=CONFIG["max_length"]
        ),
        batched=True,
        remove_columns=dataset["train"].column_names
    )
    
    print(f"   Train tokens: {len(tokenized_dataset['train']):,}")
    print(f"   Test tokens: {len(tokenized_dataset['test']):,}")
    
    # Load model
    print(f"\n🤖 Loading model: {MODEL_NAME}")
    model = AutoModelForTokenClassification.from_pretrained(
        MODEL_NAME,
        num_labels=len(label2id),
        id2label=id2label,
        label2id=label2id,
        ignore_mismatched_sizes=True
    )
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir=str(OUTPUT_DIR),
        num_train_epochs=CONFIG["num_train_epochs"],
        per_device_train_batch_size=CONFIG["per_device_train_batch_size"],
        per_device_eval_batch_size=CONFIG["per_device_eval_batch_size"],
        learning_rate=CONFIG["learning_rate"],
        weight_decay=CONFIG["weight_decay"],
        warmup_steps=CONFIG["warmup_steps"],
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        logging_dir=str(OUTPUT_DIR / "logs"),
        logging_steps=100,
        save_total_limit=3,
        fp16=torch.cuda.is_available(),
        report_to="none",
        push_to_hub=False
    )
    
    print(f"\n📊 Training arguments:")
    print(f"   Epochs: {training_args.num_train_epochs}")
    print(f"   Batch size: {training_args.per_device_train_batch_size}")
    print(f"   Learning rate: {training_args.learning_rate}")
    print(f"   Warmup steps: {training_args.warmup_steps}")
    print(f"   FP16: {training_args.fp16}")
    print(f"   Output: {OUTPUT_DIR}")
    
    # Data collator
    data_collator = DataCollatorForTokenClassification(tokenizer=tokenizer)
    
    # Initialize weighted trainer
    trainer = WeightedTrainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset["train"],
        eval_dataset=tokenized_dataset["test"],
        tokenizer=tokenizer,
        data_collator=data_collator,
        compute_metrics=lambda p: compute_metrics(p, id2label),
        class_weights=class_weights  # Pass class weights
    )
    
    # Train
    print("\n🏋️  Starting training...")
    print("=" * 80)
    trainer.train()
    
    # Evaluate
    print("\n📊 Final evaluation...")
    results = trainer.evaluate()
    print(f"\n   Precision: {results['eval_precision']:.4f}")
    print(f"   Recall: {results['eval_recall']:.4f}")
    print(f"   F1 Score: {results['eval_f1']:.4f}")
    print(f"   Accuracy: {results['eval_accuracy']:.4f}")
    
    # Save model
    print(f"\n💾 Saving model to {OUTPUT_DIR}")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    trainer.save_model(str(OUTPUT_DIR))
    tokenizer.save_pretrained(str(OUTPUT_DIR))
    
    # Save label mappings
    label_mappings = {
        "labels": label_list,
        "label2id": label2id,
        "id2label": id2label
    }
    
    with open(OUTPUT_DIR / "label_mappings.json", "w") as f:
        json.dump(label_mappings, f, indent=2)
    
    # Save training config
    training_config = {
        **CONFIG,
        "model_name": MODEL_NAME,
        "final_f1": results['eval_f1'],
        "final_precision": results['eval_precision'],
        "final_recall": results['eval_recall']
    }
    
    with open(OUTPUT_DIR / "training_config.json", "w") as f:
        json.dump(training_config, f, indent=2)
    
    print("\n✅ Training complete!")
    print(f"   Model saved to: {OUTPUT_DIR}")
    print(f"   F1 Score: {results['eval_f1']:.4f}")
    print("=" * 80)

if __name__ == "__main__":
    main()
