#!/usr/bin/env python3
"""
Simple DeBERTa v3 training script for resume NER.
Uses the prepared train.json and test.json files.
"""

import json
import torch
import numpy as np
from datasets import Dataset, DatasetDict
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification
)
from sklearn.metrics import precision_recall_fscore_support
import os

# Labels (must match your Label Studio annotations)
LABELS = [
    "O",
    "B-COMPANY", "I-COMPANY",
    "B-CLIENT", "I-CLIENT",
    "B-ROLE", "I-ROLE",
    "B-LOCATION", "I-LOCATION",
    "B-DATE_START", "I-DATE_START",
    "B-DATE_END", "I-DATE_END",
    "B-DEGREE", "I-DEGREE",
    "B-FIELD", "I-FIELD",
    "B-INSTITUTION", "I-INSTITUTION",
    "B-EDU_YEAR_START", "I-EDU_YEAR_START",
    "B-EDU_YEAR_END", "I-EDU_YEAR_END",
    "B-GRADE", "I-GRADE"
]

label2id = {label: idx for idx, label in enumerate(LABELS)}
id2label = {idx: label for idx, label in enumerate(LABELS)}

print(f"📊 Total labels: {len(LABELS)}")

# Load data
print("\n📁 Loading training data...")
with open('data/train.json', 'r') as f:
    train_data = json.load(f)

with open('data/test.json', 'r') as f:
    test_data = json.load(f)

print(f"✅ Train examples: {len(train_data)}")
print(f"✅ Test examples: {len(test_data)}")

# Convert NER tags to IDs
def convert_tags_to_ids(examples):
    converted = []
    for ex in examples:
        ner_ids = [label2id.get(tag, 0) for tag in ex['ner_tags']]
        converted.append({
            'tokens': ex['tokens'],
            'ner_tags': ner_ids
        })
    return converted

train_data = convert_tags_to_ids(train_data)
test_data = convert_tags_to_ids(test_data)

# Create Hugging Face datasets
train_dataset = Dataset.from_dict({
    'tokens': [ex['tokens'] for ex in train_data],
    'ner_tags': [ex['ner_tags'] for ex in train_data]
})

test_dataset = Dataset.from_dict({
    'tokens': [ex['tokens'] for ex in test_data],
    'ner_tags': [ex['ner_tags'] for ex in test_data]
})

dataset = DatasetDict({
    'train': train_dataset,
    'test': test_dataset
})

print(f"\n📊 Dataset created:")
print(dataset)

# Load model and tokenizer
print("\n🤖 Loading DeBERTa v3 model...")
model_name = "microsoft/deberta-v3-base"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForTokenClassification.from_pretrained(
    model_name,
    num_labels=len(LABELS),
    id2label=id2label,
    label2id=label2id
)

print(f"✅ Loaded {model_name}")
print(f"📊 Model parameters: {model.num_parameters() / 1e6:.1f}M")

# Tokenize function
def tokenize_and_align_labels(examples):
    tokenized_inputs = tokenizer(
        examples['tokens'],
        truncation=True,
        is_split_into_words=True,
        max_length=512
    )
    
    labels = []
    for i, label in enumerate(examples['ner_tags']):
        word_ids = tokenized_inputs.word_ids(batch_index=i)
        label_ids = []
        previous_word_idx = None
        
        for word_idx in word_ids:
            if word_idx is None:
                label_ids.append(-100)
            elif word_idx != previous_word_idx:
                label_ids.append(label[word_idx])
            else:
                label_ids.append(-100)
            previous_word_idx = word_idx
        
        labels.append(label_ids)
    
    tokenized_inputs['labels'] = labels
    return tokenized_inputs

print("\n🔄 Tokenizing dataset...")
tokenized_dataset = dataset.map(
    tokenize_and_align_labels,
    batched=True,
    remove_columns=dataset['train'].column_names
)

print("✅ Tokenization complete")

# Metrics
def compute_metrics(eval_preds):
    predictions, labels = eval_preds
    predictions = np.argmax(predictions, axis=2)
    
    # Remove ignored index (special tokens)
    true_predictions = [
        [LABELS[p] for (p, l) in zip(prediction, label) if l != -100]
        for prediction, label in zip(predictions, labels)
    ]
    true_labels = [
        [LABELS[l] for (p, l) in zip(prediction, label) if l != -100]
        for prediction, label in zip(predictions, labels)
    ]
    
    # Flatten for sklearn metrics
    flat_preds = [label for sublist in true_predictions for label in sublist]
    flat_labels = [label for sublist in true_labels for label in sublist]
    
    precision, recall, f1, _ = precision_recall_fscore_support(
        flat_labels, flat_preds, average='weighted', zero_division=0
    )
    
    return {
        "precision": precision,
        "recall": recall,
        "f1": f1
    }

# Training arguments
output_dir = "./checkpoints"
os.makedirs(output_dir, exist_ok=True)

training_args = TrainingArguments(
    output_dir=output_dir,
    eval_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=4,  # Reduced from 8 to avoid OOM on Mac
    per_device_eval_batch_size=4,
    num_train_epochs=5,
    weight_decay=0.01,
    logging_steps=100,
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    save_total_limit=2,
    push_to_hub=False,
    use_cpu=True,  # Use CPU instead of MPS to avoid memory issues
)

data_collator = DataCollatorForTokenClassification(tokenizer=tokenizer)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset["train"],
    eval_dataset=tokenized_dataset["test"],
    data_collator=data_collator,
    compute_metrics=compute_metrics,
)

print("\n🚀 Starting training...")
print(f"Total steps: {len(tokenized_dataset['train']) * 5 // 8}")
print("=" * 60)

# Train
trainer.train()

print("\n✅ Training completed!")

# Evaluate
print("\n📊 Evaluating on test set...")
results = trainer.evaluate()

print("\n" + "=" * 60)
print("📊 FINAL TEST RESULTS")
print("=" * 60)
print(f"Precision: {results['eval_precision']:.4f}")
print(f"Recall:    {results['eval_recall']:.4f}")
print(f"F1 Score:  {results['eval_f1']:.4f}")
print("=" * 60)

# Save final model
final_model_dir = "../models/resume-ner-deberta"
os.makedirs(final_model_dir, exist_ok=True)

print(f"\n💾 Saving model to {final_model_dir}...")
trainer.save_model(final_model_dir)
tokenizer.save_pretrained(final_model_dir)

# Save label mappings
with open(f"{final_model_dir}/label_mappings.json", "w") as f:
    json.dump({
        "labels": LABELS,
        "label_to_id": label2id,
        "id_to_label": id2label
    }, f, indent=2)

print("✅ Model saved successfully!")
print(f"\n🎉 Training complete! Model ready at: {final_model_dir}")
print("\nNext steps:")
print("1. Restart AI service: cd ../.. && source venv/bin/activate && python main.py")
print("2. Test with your resume!")
