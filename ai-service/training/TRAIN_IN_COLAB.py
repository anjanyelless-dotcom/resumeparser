"""
=============================================================================
COMPLETE DEBERTA NER TRAINING SCRIPT FOR GOOGLE COLAB
=============================================================================

INSTRUCTIONS:
1. Upload this entire folder (training-complete.zip) to Google Colab
2. Extract it
3. Copy this entire script into a Colab cell
4. Run the cell
5. Model will be saved to Google Drive automatically

=============================================================================
"""

import os
import json
import torch
import numpy as np
import datetime
import shutil

# =============================================================================
# STEP 1: Mount Google Drive
# =============================================================================
print("="*80)
print("STEP 1: MOUNTING GOOGLE DRIVE")
print("="*80)

from google.colab import drive
drive.mount('/content/drive')

# Create directory for models
os.makedirs("/content/drive/MyDrive/Resume-NER-Models", exist_ok=True)
print("\n✅ Google Drive mounted!")
print("📁 Models will be saved to: MyDrive/Resume-NER-Models/\n")

# =============================================================================
# STEP 2: Install Dependencies
# =============================================================================
print("="*80)
print("STEP 2: INSTALLING DEPENDENCIES")
print("="*80)

os.system("pip install transformers datasets accelerate evaluate seqeval -q")
print("✅ Dependencies installed!\n")

# =============================================================================
# STEP 3: Load Training Data
# =============================================================================
print("="*80)
print("STEP 3: LOADING TRAINING DATA")
print("="*80)

from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification
)
from evaluate import load

# Load data
with open('data/train.json', 'r') as f:
    train_data = json.load(f)

with open('data/test.json', 'r') as f:
    test_data = json.load(f)

print(f"✅ Train: {len(train_data)} examples")
print(f"✅ Test: {len(test_data)} examples")

# Create label mappings
all_tags = set()
for item in train_data + test_data:
    all_tags.update(item['ner_tags'])

label_list = sorted(list(all_tags))
label2id = {label: i for i, label in enumerate(label_list)}
id2label = {i: label for label, i in label2id.items()}

print(f"\n📋 Entity Labels ({len(label_list)}):")
for label in label_list:
    print(f"   • {label}")

# Count label occurrences
label_counts = {}
for item in train_data + test_data:
    for tag in item['ner_tags']:
        if tag != 'O':
            entity_type = tag.split('-')[1] if '-' in tag else tag
            label_counts[entity_type] = label_counts.get(entity_type, 0) + 1

print(f"\n📊 Label Distribution:")
for label, count in sorted(label_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"   {label:<15} {count:>6} occurrences")

# Convert to datasets
def convert_to_dataset(data):
    return Dataset.from_dict({
        'id': [item['id'] for item in data],
        'tokens': [item['tokens'] for item in data],
        'ner_tags': [[label2id[tag] for tag in item['ner_tags']] for item in data]
    })

train_dataset = convert_to_dataset(train_data)
test_dataset = convert_to_dataset(test_data)

print("\n✅ Datasets created!\n")

# =============================================================================
# STEP 4: Load Model
# =============================================================================
print("="*80)
print("STEP 4: LOADING DEBERTA MODEL")
print("="*80)

model_name = "microsoft/deberta-v3-base"
print(f"🤖 Model: {model_name}")

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForTokenClassification.from_pretrained(
    model_name,
    num_labels=len(label_list),
    id2label=id2label,
    label2id=label2id
)

print("✅ Model loaded!\n")

# =============================================================================
# STEP 5: Tokenize Data
# =============================================================================
print("="*80)
print("STEP 5: TOKENIZING DATA")
print("="*80)

def tokenize_and_align_labels(examples):
    tokenized_inputs = tokenizer(
        examples["tokens"],
        truncation=True,
        is_split_into_words=True,
        max_length=512
    )
    
    labels = []
    for i, label in enumerate(examples["ner_tags"]):
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
    
    tokenized_inputs["labels"] = labels
    return tokenized_inputs

tokenized_train = train_dataset.map(tokenize_and_align_labels, batched=True)
tokenized_test = test_dataset.map(tokenize_and_align_labels, batched=True)

print("✅ Tokenization complete!\n")

# =============================================================================
# STEP 6: Setup Training
# =============================================================================
print("="*80)
print("STEP 6: CONFIGURING TRAINING")
print("="*80)

# Metrics
seqeval = load("seqeval")

def compute_metrics(eval_preds):
    predictions, labels = eval_preds
    predictions = np.argmax(predictions, axis=2)
    
    true_predictions = []
    true_labels = []
    
    for prediction, label in zip(predictions, labels):
        true_pred = []
        true_label = []
        for pred_id, label_id in zip(prediction, label):
            if label_id != -100:
                true_pred.append(id2label[pred_id])
                true_label.append(id2label[label_id])
        true_predictions.append(true_pred)
        true_labels.append(true_label)
    
    results = seqeval.compute(predictions=true_predictions, references=true_labels)
    return {
        "precision": results["overall_precision"],
        "recall": results["overall_recall"],
        "f1": results["overall_f1"],
        "accuracy": results["overall_accuracy"],
    }

# Training arguments
training_args = TrainingArguments(
    output_dir="./resume-ner-deberta-v2",
    eval_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    num_train_epochs=3,
    weight_decay=0.01,
    logging_steps=100,
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    push_to_hub=False,
)

# Data collator
data_collator = DataCollatorForTokenClassification(tokenizer=tokenizer)

# Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_train,
    eval_dataset=tokenized_test,
    tokenizer=tokenizer,
    data_collator=data_collator,
    compute_metrics=compute_metrics,
)

print("✅ Training configured!")
print(f"   • Epochs: 3")
print(f"   • Batch size: 16")
print(f"   • Learning rate: 2e-5\n")

# =============================================================================
# STEP 7: TRAIN MODEL
# =============================================================================
print("="*80)
print("STEP 7: TRAINING MODEL (This will take ~15-20 minutes)")
print("="*80)

trainer.train()

print("\n✅ Training complete!\n")

# =============================================================================
# STEP 8: Evaluate
# =============================================================================
print("="*80)
print("STEP 8: FINAL EVALUATION")
print("="*80)

results = trainer.evaluate()

print("\n📊 Results:")
for key, value in results.items():
    print(f"   {key}: {value:.4f}")

print("\n" + "="*80)
print(f"🎯 F1 Score: {results['eval_f1']:.2%}")
print(f"🎯 Precision: {results['eval_precision']:.2%}")
print(f"🎯 Recall: {results['eval_recall']:.2%}")
print(f"🎯 Accuracy: {results['eval_accuracy']:.2%}")
print("="*80 + "\n")

# =============================================================================
# STEP 9: Save Model
# =============================================================================
print("="*80)
print("STEP 9: SAVING MODEL")
print("="*80)

trainer.save_model("./resume-ner-deberta-v2")
tokenizer.save_pretrained("./resume-ner-deberta-v2")

# Save label mappings
with open("./resume-ner-deberta-v2/label_mappings.json", "w") as f:
    json.dump({"id2label": id2label, "label2id": label2id}, f, indent=2)

print("✅ Model saved locally: ./resume-ner-deberta-v2\n")

# =============================================================================
# STEP 10: Copy to Google Drive
# =============================================================================
print("="*80)
print("STEP 10: COPYING TO GOOGLE DRIVE")
print("="*80)

timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
model_name_drive = f"resume-ner-deberta-v2_{timestamp}"
drive_path = f"/content/drive/MyDrive/Resume-NER-Models/{model_name_drive}"

print(f"📦 Copying to: {drive_path}")

shutil.copytree("./resume-ner-deberta-v2", drive_path)

print(f"\n✅ Model saved to Google Drive!")
print(f"📁 Location: MyDrive/Resume-NER-Models/{model_name_drive}\n")

# =============================================================================
# STEP 11: Create Zip File
# =============================================================================
print("="*80)
print("STEP 11: CREATING ZIP FILE")
print("="*80)

os.system("zip -r -q resume-ner-deberta-v2.zip resume-ner-deberta-v2/")
os.system('cp resume-ner-deberta-v2.zip "/content/drive/MyDrive/Resume-NER-Models/"')

print("✅ Zip file created and saved to Google Drive!")
print("📦 File: MyDrive/Resume-NER-Models/resume-ner-deberta-v2.zip\n")

# =============================================================================
# STEP 12: Test Model
# =============================================================================
print("="*80)
print("STEP 12: TESTING MODEL")
print("="*80)

test_text = "Anjan Yelle worked at Infosys Ltd as Senior Software Engineer from Jan 2021 to Mar 2023 in Bangalore. He completed Bachelor of Technology from JNTU Hyderabad."

print(f"\n📝 Test Input:\n{test_text}\n")

# Tokenize and predict
inputs = tokenizer(test_text, return_tensors="pt", truncation=True, max_length=512)

with torch.no_grad():
    outputs = model(**inputs)

predictions = torch.argmax(outputs.logits, dim=2)[0]
tokens = tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])

# Extract entities
entities = []
current_entity = None
current_label = None

for token, pred_id in zip(tokens, predictions):
    if token in ['<s>', '</s>', '<pad>']:
        continue
    
    label = id2label[pred_id.item()]
    
    if label.startswith('B-'):
        if current_entity:
            entities.append((current_label, current_entity))
        current_label = label[2:]
        current_entity = token.replace('▁', ' ')
    elif label.startswith('I-') and current_entity:
        current_entity += token.replace('▁', ' ')
    else:
        if current_entity:
            entities.append((current_label, current_entity))
            current_entity = None
            current_label = None

if current_entity:
    entities.append((current_label, current_entity))

# Display results
print("🎯 Extracted Entities:")
print("-" * 80)
for label, text in entities:
    print(f"   {label:<15} → {text.strip()}")
print("-" * 80 + "\n")

# =============================================================================
# COMPLETION SUMMARY
# =============================================================================
print("="*80)
print("✅ TRAINING COMPLETE!")
print("="*80)
print(f"\n📊 Final Results:")
print(f"   • F1 Score: {results['eval_f1']:.2%}")
print(f"   • Accuracy: {results['eval_accuracy']:.2%}")
print(f"\n📁 Model Locations:")
print(f"   • Google Drive: MyDrive/Resume-NER-Models/{model_name_drive}")
print(f"   • Zip File: MyDrive/Resume-NER-Models/resume-ner-deberta-v2.zip")
print(f"\n📥 Next Steps:")
print(f"   1. Download zip from Google Drive")
print(f"   2. Extract locally")
print(f"   3. Copy to: ai-service/models/resume-ner-deberta")
print(f"   4. Test with your application")
print("\n" + "="*80)
