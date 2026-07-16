# ============================================================================
# COMPLETE TRAINING - WITH GPU CHECK
# ============================================================================

import os
from google.colab import files, drive
import zipfile
import shutil

# Step 0: Check GPU FIRST
print("="*60)
print("STEP 0: CHECK GPU")
print("="*60)

import torch
if not torch.cuda.is_available():
    print("❌ NO GPU DETECTED!")
    print("\n⚠️  PLEASE ENABLE GPU:")
    print("   1. Click: Runtime > Change runtime type")
    print("   2. Hardware accelerator: T4 GPU")
    print("   3. Click: Save")
    print("   4. Run this cell again")
    raise SystemExit("GPU required for training")

print(f"✅ GPU: {torch.cuda.get_device_name(0)}")
print(f"   Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB\n")

# Step 1: Install packages
print("="*60)
print("STEP 1: INSTALL PACKAGES")
print("="*60)
get_ipython().system('pip install -q transformers datasets accelerate scikit-learn')
print("✅ Packages installed\n")

# Step 2: Mount Google Drive (optional)
print("="*60)
print("STEP 2: MOUNT GOOGLE DRIVE (OPTIONAL)")
print("="*60)

try:
    if os.path.exists('/content/drive'):
        get_ipython().system('fusermount -u /content/drive')
    drive.mount('/content/drive')
    print("✅ Google Drive mounted\n")
    use_drive = True
except Exception as e:
    print(f"⚠️  Drive mount skipped")
    print("⚠️  Will save locally\n")
    use_drive = False

# Step 3: Upload Data Files
print("="*60)
print("STEP 3: UPLOAD DATA FILES")
print("="*60)
os.chdir('/content')

print("📤 Upload your 3 JSON files:")
print("   - labelfiledata.json")
print("   - labelfiledata1.json")
print("   - labelfiledata2.json\n")

uploaded = files.upload()

# Handle renamed files (Colab adds (1), (2) etc if files exist)
import glob
for pattern in ['labelfiledata*.json', 'labelfiledata1*.json', 'labelfiledata2*.json']:
    matches = glob.glob(pattern)
    if matches:
        original_name = pattern.replace('*.json', '.json')
        if matches[0] != original_name:
            print(f"📝 Renaming: {matches[0]} → {original_name}")
            if os.path.exists(original_name):
                os.remove(original_name)
            os.rename(matches[0], original_name)

# Verify files exist
required_files = ['labelfiledata.json', 'labelfiledata1.json', 'labelfiledata2.json']
missing = [f for f in required_files if not os.path.exists(f)]

if missing:
    print(f"\n❌ Missing files: {missing}")
    print(f"📁 Current files: {os.listdir('.')}")
    raise SystemExit("Please upload all 3 files")

print(f"✅ All 3 files ready\n")

# Step 4: Create Training Script
print("="*60)
print("STEP 4: CREATE TRAINING SCRIPT")
print("="*60)

training_script = '''
import json
import logging
from pathlib import Path
from typing import List, Dict, Tuple
from collections import Counter
import random
import numpy as np
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification
)
from datasets import Dataset
import torch
from sklearn.metrics import f1_score

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ManualLabelTrainer:
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
        
        logger.info("="*80)
        logger.info("🎯 MANUAL LABEL TRAINING - CLEAN MODE")
        logger.info("="*80)
    
    def load_manual_labels(self, data_files: List[str]) -> List[Dict]:
        logger.info("\\n📂 Loading manual labels...")
        all_tasks = []
        
        for filepath in data_files:
            logger.info(f"📄 Loading: {filepath}")
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            valid_tasks = [task for task in data if self._validate_task(task)]
            all_tasks.extend(valid_tasks)
            logger.info(f"   ✅ {len(valid_tasks):,} tasks")
        
        logger.info(f"\\n✅ TOTAL: {len(all_tasks):,} labels loaded")
        self._show_statistics(all_tasks)
        return all_tasks
    
    def _validate_task(self, task: Dict) -> bool:
        return (
            isinstance(task, dict) and
            'text' in task and
            'label' in task and
            isinstance(task['text'], str) and
            isinstance(task['label'], list) and
            task['text'].strip()
        )
    
    def _show_statistics(self, tasks: List[Dict]):
        label_counts = Counter()
        total_entities = 0
        
        for task in tasks:
            for label in task.get('label', []):
                if isinstance(label, dict) and 'labels' in label:
                    for label_type in label['labels']:
                        label_counts[label_type] += 1
                        total_entities += 1
        
        logger.info(f"\\n📊 Statistics:")
        logger.info(f"   Tasks: {len(tasks):,}")
        logger.info(f"   Entities: {total_entities:,}")
        logger.info(f"   Avg: {total_entities / len(tasks):.1f}")
        
        logger.info(f"\\n🏷️  Top Entities:")
        for label, count in sorted(label_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
            pct = (count / total_entities) * 100
            logger.info(f"   {label:20s}: {count:6,} ({pct:5.1f}%)")
    
    def convert_to_ner_format(self, tasks: List[Dict]) -> List[Dict]:
        logger.info("\\n🔄 Converting to NER format...")
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
            except:
                skipped += 1
        
        logger.info(f"✅ Converted {len(ner_data):,} tasks")
        if skipped > 0:
            logger.info(f"⚠️  Skipped {skipped:,} invalid")
        
        return ner_data
    
    def split_train_val(self, data: List[Dict], val_split: float = 0.15):
        random.seed(42)
        shuffled = data.copy()
        random.shuffle(shuffled)
        
        val_size = int(len(shuffled) * val_split)
        val_data = shuffled[:val_size]
        train_data = shuffled[val_size:]
        
        logger.info(f"\\n📊 Split:")
        logger.info(f"   Train: {len(train_data):,} ({(1-val_split)*100:.0f}%)")
        logger.info(f"   Val: {len(val_data):,} ({val_split*100:.0f}%)")
        
        return train_data, val_data
    
    def tokenize_and_align_labels(self, examples, tokenizer):
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
            
            char_labels = ["O"] * len(text)
            for entity in entities:
                start, end = entity["start"], entity["end"]
                entity_type = entity["label"]
                if start < len(char_labels):
                    char_labels[start] = f"B-{entity_type}"
                for pos in range(start + 1, min(end, len(char_labels))):
                    char_labels[pos] = f"I-{entity_type}"
            
            prev_word_idx = None
            for word_idx in word_ids:
                if word_idx is None:
                    label_ids.append(-100)
                elif word_idx != prev_word_idx:
                    label = char_labels[min(word_idx, len(char_labels) - 1)]
                    label_ids.append(self.label2id.get(label, 0))
                else:
                    label_ids.append(-100)
                prev_word_idx = word_idx
            
            labels.append(label_ids)
        
        tokenized_inputs["labels"] = labels
        return tokenized_inputs
    
    def prepare_datasets(self, train_data, val_data, tokenizer):
        logger.info("\\n📦 Preparing datasets...")
        
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
        
        logger.info(f"✅ Train: {len(train_dataset)}")
        logger.info(f"✅ Val: {len(val_dataset)}")
        
        return train_dataset, val_dataset
    
    def compute_metrics(self, eval_pred):
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
        logger.info("\\n🚀 Training...")
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"🖥️  Device: {device}")
        
        model = AutoModelForTokenClassification.from_pretrained(
            self.model_name,
            num_labels=len(self.ENTITY_LABELS),
            id2label=self.id2label,
            label2id=self.label2id
        )
        
        training_args = TrainingArguments(
            output_dir=self.output_dir,
            eval_strategy="epoch",
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
        )
        
        data_collator = DataCollatorForTokenClassification(tokenizer)
        
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=val_dataset,
            tokenizer=tokenizer,
            data_collator=data_collator,
            compute_metrics=self.compute_metrics
        )
        
        logger.info("🏋️  Training...")
        trainer.train()
        
        logger.info(f"\\n💾 Saving to {self.output_dir}")
        trainer.save_model()
        tokenizer.save_pretrained(self.output_dir)
        
        with open(f"{self.output_dir}/training_info.json", "w") as f:
            json.dump({
                "model_name": self.model_name,
                "train_samples": len(train_dataset),
                "val_samples": len(val_dataset),
                "num_labels": len(self.ENTITY_LABELS),
                "data_source": "manual_labels_only"
            }, f, indent=2)
        
        logger.info("\\n📊 Final Evaluation:")
        eval_results = trainer.evaluate()
        logger.info(f"   F1 Score: {eval_results['eval_f1']:.4f}")
        logger.info(f"   Loss: {eval_results['eval_loss']:.4f}")
        
        logger.info("\\n✅ Training complete!")
        return trainer

def main():
    data_files = [
        "labelfiledata.json",
        "labelfiledata1.json",
        "labelfiledata2.json"
    ]
    
    trainer_obj = ManualLabelTrainer()
    tasks = trainer_obj.load_manual_labels(data_files)
    
    if not tasks:
        print("❌ No data loaded!")
        return
    
    ner_data = trainer_obj.convert_to_ner_format(tasks)
    train_data, val_data = trainer_obj.split_train_val(ner_data)
    
    print(f"\\n📥 Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(trainer_obj.model_name)
    
    train_dataset, val_dataset = trainer_obj.prepare_datasets(train_data, val_data, tokenizer)
    trainer = trainer_obj.train(train_dataset, val_dataset, tokenizer)
    
    print("\\n" + "="*80)
    print("✅ TRAINING COMPLETE!")
    print("="*80)

if __name__ == "__main__":
    main()
'''

with open('train_model.py', 'w') as f:
    f.write(training_script)

print("✅ Training script created\n")

# Step 5: Train
print("="*60)
print("STEP 5: TRAINING")
print("="*60)
print("🏋️  Training DeBERTa NER Model")
print("⏱️  ~1-2 hours (5 epochs)")
print("📊 32,100 manual labels")
print("🎯 Target F1: > 85%\n")
print("="*60 + "\n")

get_ipython().system('python train_model.py')

# Step 6: Finalize
print("\n" + "="*60)
print("STEP 6: FINALIZE")
print("="*60)

model_path = '/content/trained_model'

if os.path.exists(model_path):
    print("✅ Model trained!")
    
    print("\n📦 Creating ZIP...")
    shutil.make_archive('trained_model', 'zip', model_path)
    
    zip_size = os.path.getsize('trained_model.zip') / 1024 / 1024
    
    print("\n" + "="*60)
    print("🎉 SUCCESS!")
    print("="*60)
    print(f"✅ Model: {zip_size:.1f} MB")
    
    if use_drive:
        drive_path = '/content/drive/MyDrive/Resume-NER-Model'
        os.makedirs(drive_path, exist_ok=True)
        shutil.copy('trained_model.zip', f'{drive_path}/trained_model.zip')
        print(f"\n📥 Saved to Google Drive:")
        print(f"   MyDrive/Resume-NER-Model/trained_model.zip")
    
    print(f"\n📥 Downloading...")
    try:
        files.download('trained_model.zip')
        print("✅ Download started!")
    except:
        print("⚠️  Download failed, check Google Drive")
    
    print("\n🎯 Expected: F1 > 85%")
    print("="*60)
else:
    print("❌ Model not found")
