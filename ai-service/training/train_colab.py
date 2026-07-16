"""
Complete DeBERTa Training Script for Google Colab
Copy this entire script into a Colab cell and run it.
"""

# ============================================================================
# STEP 1: Upload training-package.zip
# ============================================================================
from google.colab import files
import os

print("📤 Upload training-package.zip:")
uploaded = files.upload()

# Extract
os.system("unzip -q training-package.zip")
os.system("ls -lh data/")

print("\n✅ Training data uploaded and extracted!")

# ============================================================================
# STEP 2: Mount Google Drive
# ============================================================================
from google.colab import drive
drive.mount('/content/drive')

# Create directory for models
os.makedirs("/content/drive/MyDrive/Resume-NER-Models", exist_ok=True)
print("\n✅ Google Drive mounted!")
print("📁 Models will be saved to: MyDrive/Resume-NER-Models/")

# ============================================================================
# STEP 3: Install Dependencies
# ============================================================================
os.system("pip install transformers datasets accelerate evaluate seqeval -q")
print("✅ Dependencies installed!")

# ============================================================================
# STEP 4: Load and Prepare Data
# ============================================================================
import json
import torch
from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification
)
from evaluate import load
import numpy as np

# Load training data
print("\n📖 Loading training data...")
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

print(f"\n📋 Labels ({len(label_list)}):")
for label in label_list:
    print(f"   • {label}")

# Convert to datasets
def convert_to_dataset(data):
    return Dataset.from_dict({
        'id': [item['id'] for item in data],
        'tokens': [item['tokens'] for item in data],
        'ner_tags': [[label2id[tag] for tag in item['ner_tags']] for item in data]
    })

train_dataset = convert_to_dataset(train_data)
test_dataset = convert_to_dataset(test_data)

print("\n✅ Datasets created!")

# ============================================================================
# STEP 5: Load Model and Tokenizer
# ============================================================================
model_name = "microsoft/deberta-v3-base"
print(f"\n🤖 Loading model: {model_name}")

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForTokenClassification.from_pretrained(
    model_name,
    num_labels=len(label_list),
    id2label=id2label,
    label2id=label2id
)

print("✅ Model loaded!")

# ============================================================================
# STEP 6: Tokenize Data
# ============================================================================
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

print("\n🔄 Tokenizing datasets...")
tokenized_train = train_dataset.map(tokenize_and_align_labels, batched=True)
tokenized_test = test_dataset.map(tokenize_and_align_labels, batched=True)
print("✅ Tokenization complete!")

# ============================================================================
# STEP 7: Setup Training
# ============================================================================
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

# Training arguments - FIXED for newer transformers versions
training_args = TrainingArguments(
    output_dir="./resume-ner-deberta-v2",
    eval_strategy="epoch",           # Changed from evaluation_strategy
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

print("\n✅ Training setup complete!")

# ============================================================================
# STEP 8: Train Model
# ============================================================================
print("\n🚀 Starting training...")
print("="*80)
trainer.train()
print("\n✅ Training complete!")

# ============================================================================
# STEP 9: Evaluate Model
# ============================================================================
print("\n📊 Final Evaluation:")
print("="*80)
results = trainer.evaluate()

for key, value in results.items():
    print(f"{key}: {value:.4f}")

print("\n" + "="*80)
print(f"🎯 F1 Score: {results['eval_f1']:.2%}")
print(f"🎯 Accuracy: {results['eval_accuracy']:.2%}")
print("="*80)

# ============================================================================
# STEP 10: Save Model
# ============================================================================
print("\n💾 Saving model...")
trainer.save_model("./resume-ner-deberta-v2")
tokenizer.save_pretrained("./resume-ner-deberta-v2")

# Save label mappings
with open("./resume-ner-deberta-v2/label_mappings.json", "w") as f:
    json.dump({"id2label": id2label, "label2id": label2id}, f, indent=2)

print("✅ Model saved to: ./resume-ner-deberta-v2")
os.system("ls -lh resume-ner-deberta-v2/")

# ============================================================================
# STEP 11: Copy to Google Drive
# ============================================================================
import shutil
import datetime

timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
model_name_drive = f"resume-ner-deberta-v2_{timestamp}"
drive_path = f"/content/drive/MyDrive/Resume-NER-Models/{model_name_drive}"

print(f"\n📦 Copying model to Google Drive...")
print(f"📁 Destination: {drive_path}")

shutil.copytree("./resume-ner-deberta-v2", drive_path)

print("\n✅ Model copied to Google Drive!")
print(f"📁 Location: MyDrive/Resume-NER-Models/{model_name_drive}")

os.system(f'ls -lh "{drive_path}"')

# ============================================================================
# STEP 12: Create Zip
# ============================================================================
print("\n📦 Creating zip file...")
os.system("zip -r resume-ner-deberta-v2.zip resume-ner-deberta-v2/")

print("\n✅ Zip file created!")
os.system("ls -lh resume-ner-deberta-v2.zip")

# Save zip to Google Drive
os.system('cp resume-ner-deberta-v2.zip "/content/drive/MyDrive/Resume-NER-Models/"')
print("\n✅ Zip also saved to Google Drive!")

# ============================================================================
# STEP 13: Test Model
# ============================================================================
test_text = "Anjan Yelle worked at Infosys Ltd as Senior Software Engineer from Jan 2021 to Mar 2023 in Bangalore. He completed Bachelor of Technology from JNTU Hyderabad."

print("\n🧪 Testing model...")
print(f"Input: {test_text}\n")

# Tokenize
inputs = tokenizer(test_text, return_tensors="pt", truncation=True, max_length=512)

# Predict
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
print("Extracted Entities:")
print("="*80)
for label, text in entities:
    print(f"{label:<15} {text}")
print("="*80)

# ============================================================================
# STEP 14: Download (Optional)
# ============================================================================
print("\n⬇️ To download the model zip, run this in a new cell:")
print("from google.colab import files")
print("files.download('resume-ner-deberta-v2.zip')")

print("\n" + "="*80)
print("✅ TRAINING COMPLETE!")
print("="*80)
print(f"📁 Model saved to Google Drive: MyDrive/Resume-NER-Models/{model_name_drive}")
print("📦 Zip file: MyDrive/Resume-NER-Models/resume-ner-deberta-v2.zip")
print("="*80)
