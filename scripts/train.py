#!/usr/bin/env python3
"""
Fine-tune DeBERTa-v3 for Resume NER training.
Loads CoNLL format data and trains with specified parameters.
"""

import os
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
from seqeval.metrics import classification_report, f1_score
from sklearn.metrics import precision_recall_fscore_support
import json
from pathlib import Path


def read_conll_file(file_path: str):
    """Read CoNLL file and return list of sentences with token-label pairs."""
    sentences = []
    current_sentence = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:  # Non-empty line (token-label pair)
                parts = line.split('\t')
                if len(parts) == 2:
                    token, label = parts
                    current_sentence.append((token, label))
            else:  # Empty line (sentence boundary)
                if current_sentence:
                    sentences.append(current_sentence)
                    current_sentence = []
    
    # Add the last sentence if file doesn't end with empty line
    if current_sentence:
        sentences.append(current_sentence)
    
    return sentences


def create_label_mappings():
    """Create label to ID mappings for all entities."""
    # Define all labels (including BIO variants)
    labels = [
        'O',  # Outside
        # Work Experience Labels
        'B-COMPANY', 'I-COMPANY',
        'B-CLIENT', 'I-CLIENT',
        'B-ROLE', 'I-ROLE',
        'B-LOCATION', 'I-LOCATION',
        'B-DATE_START', 'I-DATE_START',
        'B-DATE_END', 'I-DATE_END',
        # Education Labels
        'B-DEGREE', 'I-DEGREE',
        'B-FIELD', 'I-FIELD',
        'B-INSTITUTION', 'I-INSTITUTION',
        'B-EDU_YEAR_START', 'I-EDU_YEAR_START',
        'B-EDU_YEAR_END', 'I-EDU_YEAR_END',
        'B-GRADE', 'I-GRADE'
    ]
    
    label_to_id = {label: i for i, label in enumerate(labels)}
    id_to_label = {i: label for label, i in label_to_id.items()}
    
    return labels, label_to_id, id_to_label


def tokenize_and_align_labels(examples, tokenizer, label_to_id, max_length=512):
    """Tokenize and align labels with tokenizer."""
    tokenized_inputs = tokenizer(
        examples["tokens"],
        truncation=True,
        padding=True,
        max_length=max_length,
        is_split_into_words=True
    )
    
    labels = []
    for i, label in enumerate(examples["ner_tags"]):
        word_ids = tokenized_inputs.word_ids(batch_index=i)
        previous_word_idx = None
        label_ids = []
        
        for word_idx in word_ids:
            if word_idx is None:
                label_ids.append(-100)  # Special tokens
            elif word_idx != previous_word_idx:
                # First token of a new word
                current_label = label[word_idx]
                # Handle typo in data - convert B-FEILD to B-FIELD
                if current_label == 'B-FEILD':
                    current_label = 'B-FIELD'
                elif current_label == 'I-FEILD':
                    current_label = 'I-FIELD'
                
                if current_label in label_to_id:
                    label_ids.append(label_to_id[current_label])
                else:
                    label_ids.append(label_to_id['O'])  # Default to O if label not found
            else:
                # Subsequent tokens of the same word
                current_label = label[word_idx]
                # Handle typo in data
                if current_label == 'B-FEILD':
                    current_label = 'B-FIELD'
                elif current_label == 'I-FEILD':
                    current_label = 'I-FIELD'
                
                if current_label.startswith('B-'):
                    # Convert B- to I- for sub-tokens
                    base_label = 'I-' + current_label[2:]
                    if base_label in label_to_id:
                        label_ids.append(label_to_id[base_label])
                    else:
                        label_ids.append(label_to_id['O'])
                else:
                    if current_label in label_to_id:
                        label_ids.append(label_to_id[current_label])
                    else:
                        label_ids.append(label_to_id['O'])
            previous_word_idx = word_idx
        
        labels.append(label_ids)
    
    tokenized_inputs["labels"] = labels
    return tokenized_inputs


def prepare_dataset(train_file, test_file, tokenizer, label_to_id, max_length=512):
    """Prepare training and test datasets."""
    # Read CoNLL files
    train_sentences = read_conll_file(train_file)
    test_sentences = read_conll_file(test_file)
    
    print(f"Loaded {len(train_sentences)} training sentences")
    print(f"Loaded {len(test_sentences)} test sentences")
    
    # Convert to dataset format
    def sentences_to_dataset(sentences):
        tokens = []
        ner_tags = []
        
        for sentence in sentences:
            sentence_tokens = [token for token, label in sentence]
            sentence_labels = [label for token, label in sentence]
            tokens.append(sentence_tokens)
            ner_tags.append(sentence_labels)
        
        return Dataset.from_dict({
            "tokens": tokens,
            "ner_tags": ner_tags
        })
    
    train_dataset = sentences_to_dataset(train_sentences)
    test_dataset = sentences_to_dataset(test_sentences)
    
    # Tokenize and align labels
    train_dataset = train_dataset.map(
        lambda x: tokenize_and_align_labels(x, tokenizer, label_to_id, max_length),
        batched=True
    )
    test_dataset = test_dataset.map(
        lambda x: tokenize_and_align_labels(x, tokenizer, label_to_id, max_length),
        batched=True
    )
    
    return train_dataset, test_dataset


def compute_metrics(p, label_list):
    """Compute evaluation metrics."""
    predictions, labels = p
    predictions = np.argmax(predictions, axis=2)
    
    # Remove ignored index (-100)
    true_predictions = [
        [label_list[p] for (p, l) in zip(prediction, label) if l != -100]
        for prediction, label in zip(predictions, labels)
    ]
    true_labels = [
        [label_list[l] for (p, l) in zip(prediction, label) if l != -100]
        for prediction, label in zip(predictions, labels)
    ]
    
    # Calculate metrics
    f1 = f1_score(true_labels, true_predictions)
    report = classification_report(true_labels, true_predictions, output_dict=True)
    
    return {
        "f1": f1,
        "report": report
    }


def main():
    """Main training function."""
    print("🚀 STARTING DEBERTA NER TRAINING")
    print("=" * 60)
    
    # Setup
    model_name = "microsoft/deberta-v3-base"
    train_file = "data/splits/train.conll"
    test_file = "data/splits/test.conll"
    output_dir = "models/resume-ner-final"
    
    # Training parameters
    epochs = 5
    learning_rate = 2e-5
    batch_size = 8
    max_length = 512
    
    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    print(f"📂 Model: {model_name}")
    print(f"📊 Training: {epochs} epochs, LR: {learning_rate}, Batch: {batch_size}")
    print(f"📁 Output: {output_dir}")
    
    # Load tokenizer and create label mappings
    print("🔤 Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    labels, label_to_id, id_to_label = create_label_mappings()
    
    print(f"🏷️  Labels: {len(labels)} total")
    print(f"📝 Label list: {labels}")
    
    # Prepare datasets
    print("📖 Preparing datasets...")
    train_dataset, test_dataset = prepare_dataset(
        train_file, test_file, tokenizer, label_to_id, max_length
    )
    
    # Load model
    print("🤖 Loading model...")
    model = AutoModelForTokenClassification.from_pretrained(
        model_name,
        num_labels=len(labels),
        id2label=id_to_label,
        label2id=label_to_id
    )
    
    # Setup data collator
    data_collator = DataCollatorForTokenClassification(tokenizer)
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=learning_rate,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        greater_is_better=True,
        logging_steps=50,
        save_total_limit=3,
        push_to_hub=False,
        report_to="none",
    )
    
    # Setup trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=test_dataset,
        data_collator=data_collator,
        compute_metrics=lambda p: compute_metrics(p, labels),
    )
    
    # Start training
    print("🏋️  Starting training...")
    trainer.train()
    
    # Final evaluation
    print("📊 Final evaluation...")
    eval_results = trainer.evaluate()
    
    # Print detailed metrics
    print("\n🎯 FINAL RESULTS")
    print("=" * 60)
    print(f"✅ Final F1 Score: {eval_results['eval_f1']:.4f}")
    
    # Get detailed classification report
    predictions = trainer.predict(test_dataset)
    metrics = compute_metrics((predictions.predictions, predictions.label_ids), labels)
    
    print("\n📋 PER-LABEL ACCURACY:")
    print("-" * 40)
    
    # Print metrics for each label type
    base_labels = ['COMPANY', 'CLIENT', 'ROLE', 'LOCATION', 'DATE_START', 'DATE_END',
                   'DEGREE', 'FIELD', 'INSTITUTION', 'EDU_YEAR_START', 'EDU_YEAR_END', 'GRADE']
    
    for label in base_labels:
        b_label = f"B-{label}"
        i_label = f"I-{label}"
        
        if b_label in metrics['report']:
            b_f1 = metrics['report'][b_label]['f1-score']
            print(f"{b_label:<15}: {b_f1:.4f}")
        
        if i_label in metrics['report']:
            i_f1 = metrics['report'][i_label]['f1-score']
            print(f"{i_label:<15}: {i_f1:.4f}")
    
    # Save final model
    print(f"\n💾 Saving model to {output_dir}...")
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)
    
    # Save label mappings
    with open(f"{output_dir}/label_mappings.json", 'w') as f:
        json.dump({
            "labels": labels,
            "label_to_id": label_to_id,
            "id_to_label": id_to_label
        }, f, indent=2)
    
    print("✅ Training completed successfully!")
    print(f"🎉 Model saved to: {output_dir}")
    print(f"📊 Final F1: {eval_results['eval_f1']:.4f}")


if __name__ == "__main__":
    main()
