#!/usr/bin/env python3
"""
Simple local training script - No Colab needed!
Just run: python3 train_local_simple.py
"""

import os
import json
import torch
import numpy as np
from pathlib import Path
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification
)
from sklearn.utils.class_weight import compute_class_weight
import evaluate

print("="*80)
print("SIMPLE LOCAL TRAINING - Resume NER Model")
print("="*80)

# Check if data exists
if not os.path.exists("data/dataset_train.conll"):
    print("\n❌ Error: data/dataset_train.conll not found!")
    print("Make sure you're running this from the training/ directory")
    exit(1)

if not os.path.exists("data/dataset_test.conll"):
    print("\n❌ Error: data/dataset_test.conll not found!")
    exit(1)

print("\n✅ Data files found!")

# Configuration
MODEL_NAME = "microsoft/deberta-v3-base"
OUTPUT_DIR = "./resume-ner-deberta-weighted"
MAX_LENGTH = 512
BATCH_SIZE = 4  # Smaller for Mac
EPOCHS = 10  # Reduced for faster training
LEARNING_RATE = 2e-5

print(f"\n📊 Training Configuration:")
print(f"   Model: {MODEL_NAME}")
print(f"   Output: {OUTPUT_DIR}")
print(f"   Batch size: {BATCH_SIZE}")
print(f"   Epochs: {EPOCHS}")
print(f"   Learning rate: {LEARNING_RATE}")

# Load dataset manually
print("\n📂 Loading dataset...")

def load_conll_file(filepath):
    """Load CoNLL format file"""
    sentences = []
    current_tokens = []
    current_labels = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                if current_tokens:
                    sentences.append({
                        "tokens": current_tokens,
                        "ner_tags": current_labels
                    })
                    current_tokens = []
                    current_labels = []
            else:
                parts = line.split('\t') if '\t' in line else line.split()
                if len(parts) == 2:
                    token, label = parts
                    current_tokens.append(token)
                    current_labels.append(label)
        
        # Add last sentence
        if current_tokens:
            sentences.append({
                "tokens": current_tokens,
                "ner_tags": current_labels
            })
    
    return sentences

train_data = load_conll_file("data/dataset_train.conll")
test_data = load_conll_file("data/dataset_test.conll")

print(f"   Train examples: {len(train_data):,}")
print(f"   Test examples: {len(test_data):,}")

# Extract unique labels
print("\n🏷️  Extracting labels...")
all_labels = []
for example in train_data:
    all_labels.extend(example["ner_tags"])

unique_labels = sorted(set(all_labels))
label_list = unique_labels

# Create label mappings
label2id = {label: i for i, label in enumerate(label_list)}
id2label = {i: label for i, label in enumerate(label_list)}

print(f"   Found {len(label_list)} unique labels")

# Save label mappings
os.makedirs(OUTPUT_DIR, exist_ok=True)
with open(f"{OUTPUT_DIR}/label_mappings.json", "w") as f:
    json.dump({
        "labels": label_list,
        "label2id": label2id,
        "id2label": id2label
    }, f, indent=2)

print(f"   ✅ Label mappings saved to {OUTPUT_DIR}/label_mappings.json")

# Compute class weights
print("\n⚖️  Computing class weights...")
class_weights = compute_class_weight(
    class_weight='balanced',
    classes=np.array(label_list),
    y=all_labels
)

# Increase weight for I- tags
class_weights_dict = {}
for i, label in enumerate(label_list):
    if label.startswith('I-'):
        class_weights_dict[i] = class_weights[i] * 2.0  # 2x weight for I- tags
    else:
        class_weights_dict[i] = class_weights[i]

print(f"   ✅ Class weights computed (I- tags weighted 2x)")

# Load tokenizer
print(f"\n🔤 Loading tokenizer: {MODEL_NAME}")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
print(f"   ✅ Tokenizer loaded")

# Tokenization function
def tokenize_and_align_labels(examples):
    """Tokenize and align labels for a batch of examples"""
    tokenized_inputs = tokenizer(
        examples["tokens"],
        truncation=True,
        is_split_into_words=True,
        max_length=MAX_LENGTH,
        padding="max_length"
    )

    labels = []
    for i, label_list_item in enumerate(examples["ner_tags"]):
        word_ids = tokenized_inputs.word_ids(batch_index=i)
        previous_word_idx = None
        label_ids = []
        
        for word_idx in word_ids:
            if word_idx is None:
                label_ids.append(-100)
            elif word_idx != previous_word_idx:
                # Convert string label to ID
                label_str = label_list_item[word_idx]
                label_ids.append(label2id[label_str])
            else:
                label_ids.append(-100)
            previous_word_idx = word_idx
        
        labels.append(label_ids)

    tokenized_inputs["labels"] = labels
    return tokenized_inputs

# Tokenize dataset
print("\n⚙️  Tokenizing dataset...")

# Convert to Dataset format
from datasets import Dataset
train_dataset = Dataset.from_dict({
    "tokens": [ex["tokens"] for ex in train_data],
    "ner_tags": [ex["ner_tags"] for ex in train_data]
})
test_dataset = Dataset.from_dict({
    "tokens": [ex["tokens"] for ex in test_data],
    "ner_tags": [ex["ner_tags"] for ex in test_data]
})

tokenized_train = train_dataset.map(
    tokenize_and_align_labels,
    batched=True,
    remove_columns=train_dataset.column_names
)
tokenized_test = test_dataset.map(
    tokenize_and_align_labels,
    batched=True,
    remove_columns=test_dataset.column_names
)

print(f"   ✅ Tokenization complete")

# Load model
print(f"\n🤖 Loading model: {MODEL_NAME}")
model = AutoModelForTokenClassification.from_pretrained(
    MODEL_NAME,
    num_labels=len(label_list),
    id2label=id2label,
    label2id=label2id,
    ignore_mismatched_sizes=True
)
print(f"   ✅ Model loaded")

# Data collator
data_collator = DataCollatorForTokenClassification(tokenizer=tokenizer)

# Metrics
seqeval = evaluate.load("seqeval")

def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=2)

    true_predictions = [
        [label_list[p] for (p, l) in zip(prediction, label) if l != -100]
        for prediction, label in zip(predictions, labels)
    ]
    true_labels = [
        [label_list[l] for (p, l) in zip(prediction, label) if l != -100]
        for prediction, label in zip(predictions, labels)
    ]

    results = seqeval.compute(predictions=true_predictions, references=true_labels)
    
    return {
        "precision": results["overall_precision"],
        "recall": results["overall_recall"],
        "f1": results["overall_f1"],
        "accuracy": results["overall_accuracy"],
    }

# Custom Trainer with class weights
class WeightedTrainer(Trainer):
    def compute_loss(self, model, inputs, return_outputs=False, num_items_in_batch=None):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        logits = outputs.logits
        
        # Match the dtype of logits (could be float16 or float32)
        loss_fct = torch.nn.CrossEntropyLoss(
            weight=torch.tensor(list(class_weights_dict.values()), 
                              dtype=logits.dtype).to(logits.device)
        )
        
        active_loss = labels.view(-1) != -100
        active_logits = logits.view(-1, len(label_list))
        active_labels = torch.where(
            active_loss,
            labels.view(-1),
            torch.tensor(loss_fct.ignore_index).type_as(labels)
        )
        
        loss = loss_fct(active_logits, active_labels)
        
        return (loss, outputs) if return_outputs else loss

# Training arguments
training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    eval_strategy="epoch",  # Changed from evaluation_strategy
    save_strategy="epoch",
    learning_rate=LEARNING_RATE,
    per_device_train_batch_size=BATCH_SIZE,
    per_device_eval_batch_size=BATCH_SIZE,
    num_train_epochs=EPOCHS,
    weight_decay=0.01,
    warmup_steps=500,
    logging_dir=f"{OUTPUT_DIR}/logs",
    logging_steps=100,
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    save_total_limit=2,
    push_to_hub=False,
    report_to="none",  # Disable wandb/tensorboard
)

# Initialize trainer
print("\n🏋️  Initializing trainer...")
trainer = WeightedTrainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_train,
    eval_dataset=tokenized_test,
    processing_class=tokenizer,  # Changed from tokenizer
    data_collator=data_collator,
    compute_metrics=compute_metrics,
)

print(f"   ✅ Trainer initialized")

# Train
print("\n" + "="*80)
print("🚀 STARTING TRAINING")
print("="*80)
print(f"\n⏱️  This will take approximately 20-30 minutes on Mac...")
print(f"💡 You can monitor progress below\n")

trainer.train()

print("\n" + "="*80)
print("✅ TRAINING COMPLETE!")
print("="*80)

# Evaluate
print("\n📊 Final evaluation...")
results = trainer.evaluate()

print(f"\n📈 Final Results:")
print(f"   Precision: {results['eval_precision']:.4f}")
print(f"   Recall:    {results['eval_recall']:.4f}")
print(f"   F1 Score:  {results['eval_f1']:.4f}")
print(f"   Accuracy:  {results['eval_accuracy']:.4f}")

# Save model
print(f"\n💾 Saving model to {OUTPUT_DIR}...")
trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

print(f"   ✅ Model saved!")

# Save training config
config = {
    "model_name": MODEL_NAME,
    "num_labels": len(label_list),
    "max_length": MAX_LENGTH,
    "batch_size": BATCH_SIZE,
    "epochs": EPOCHS,
    "learning_rate": LEARNING_RATE,
    "class_weights_applied": True,
    "i_tag_weight_multiplier": 2.0,
    "final_f1": results['eval_f1']
}

with open(f"{OUTPUT_DIR}/training_config.json", "w") as f:
    json.dump(config, f, indent=2)

print(f"   ✅ Training config saved!")

# Test the model
print("\n🧪 Testing model...")
test_text = "I worked as a Senior Full Stack Developer at Google from Jan 2020 to Present"
print(f"\n📝 Input: {test_text}")

from transformers import pipeline
ner_pipeline = pipeline(
    "ner",
    model=model,
    tokenizer=tokenizer,
    aggregation_strategy="simple"
)

results = ner_pipeline(test_text)
print(f"\n🔍 Predictions:")
for entity in results:
    print(f"   {entity['entity_group']:15s}: {entity['word']}")

print("\n" + "="*80)
print("🎉 ALL DONE!")
print("="*80)
print(f"\n✅ Model saved to: {OUTPUT_DIR}")
print(f"\n📋 Next steps:")
print(f"   1. Copy the model to your ai-service:")
print(f"      cp -r {OUTPUT_DIR} ../../models/resume-ner-deberta")
print(f"   2. Restart your AI service")
print(f"   3. Test with real resumes!")
print("\n" + "="*80)
