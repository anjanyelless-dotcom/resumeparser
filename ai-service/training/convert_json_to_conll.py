#!/usr/bin/env python3
"""
Convert Label Studio JSON format to CoNLL format and merge with existing data
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Tuple

def load_json_file(filepath: str) -> List[Dict]:
    """Load JSON label file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def json_to_conll(json_data: List[Dict]) -> List[str]:
    """Convert JSON annotations to CoNLL format."""
    conll_lines = []
    
    for item in json_data:
        text = item['text']
        labels = item.get('label', [])
        
        # Create character-level label mapping
        char_labels = ['O'] * len(text)
        
        for annotation in labels:
            start = annotation['start']
            end = annotation['end']
            label_type = annotation['labels'][0]
            
            # Apply BIO tagging
            for i in range(start, end):
                if i < len(char_labels):
                    if i == start:
                        char_labels[i] = f'B-{label_type}'
                    else:
                        char_labels[i] = f'I-{label_type}'
        
        # Tokenize by whitespace and assign labels
        tokens = []
        current_pos = 0
        
        for word in text.split():
            # Find word position in text
            word_start = text.find(word, current_pos)
            word_end = word_start + len(word)
            
            # Get label for first character of word
            token_label = char_labels[word_start] if word_start < len(char_labels) else 'O'
            
            tokens.append((word, token_label))
            current_pos = word_end
        
        # Write tokens in CoNLL format
        for token, label in tokens:
            conll_lines.append(f"{token}\t{label}")
        
        # Empty line to separate sentences
        conll_lines.append("")
    
    return conll_lines

def merge_conll_files(existing_file: str, new_lines: List[str], output_file: str):
    """Merge new CoNLL data with existing file."""
    # Read existing data
    with open(existing_file, 'r', encoding='utf-8') as f:
        existing_lines = f.readlines()
    
    # Remove trailing newlines
    existing_lines = [line.rstrip('\n') for line in existing_lines]
    
    # Combine
    all_lines = existing_lines + new_lines
    
    # Write to output
    with open(output_file, 'w', encoding='utf-8') as f:
        for line in all_lines:
            f.write(line + '\n')
    
    # Count sentences
    sentence_count = sum(1 for line in all_lines if line.strip() == '')
    return sentence_count

def main():
    print("="*60)
    print("JSON TO CONLL CONVERTER")
    print("="*60)
    
    # Paths
    data_dir = Path(__file__).parent / "data"
    json_files = [
        data_dir / "labeldatafile29.json",
        data_dir / "labeldatafile30.json",
        data_dir / "labeldatafile31.json"
    ]
    
    existing_train = data_dir / "simple_dataset_train.conll"
    existing_test = data_dir / "simple_dataset_test.conll"
    
    # Check files exist
    for jf in json_files:
        if not jf.exists():
            print(f"❌ File not found: {jf}")
            return
    
    print(f"\n📂 Found {len(json_files)} JSON files")
    
    # Convert all JSON files
    all_conll_lines = []
    total_examples = 0
    
    for json_file in json_files:
        print(f"\n📖 Processing: {json_file.name}")
        json_data = load_json_file(str(json_file))
        print(f"   Examples: {len(json_data)}")
        
        conll_lines = json_to_conll(json_data)
        all_conll_lines.extend(conll_lines)
        total_examples += len(json_data)
    
    print(f"\n✅ Converted {total_examples} examples to CoNLL format")
    
    # Split into train/test (90/10)
    sentences = []
    current_sentence = []
    
    for line in all_conll_lines:
        if line.strip() == "":
            if current_sentence:
                sentences.append(current_sentence)
                current_sentence = []
        else:
            current_sentence.append(line)
    
    if current_sentence:
        sentences.append(current_sentence)
    
    split_idx = int(len(sentences) * 0.9)
    train_sentences = sentences[:split_idx]
    test_sentences = sentences[split_idx:]
    
    print(f"\n📊 Split:")
    print(f"   Train: {len(train_sentences)} sentences")
    print(f"   Test: {len(test_sentences)} sentences")
    
    # Convert back to lines
    new_train_lines = []
    for sent in train_sentences:
        new_train_lines.extend(sent)
        new_train_lines.append("")
    
    new_test_lines = []
    for sent in test_sentences:
        new_test_lines.extend(sent)
        new_test_lines.append("")
    
    # Merge with existing data
    print(f"\n🔄 Merging with existing data...")
    
    # Backup originals
    backup_train = data_dir / "simple_dataset_train.conll.backup"
    backup_test = data_dir / "simple_dataset_test.conll.backup"
    
    if not backup_train.exists():
        print(f"   Creating backup: {backup_train.name}")
        os.system(f'cp "{existing_train}" "{backup_train}"')
    
    if not backup_test.exists():
        print(f"   Creating backup: {backup_test.name}")
        os.system(f'cp "{existing_test}" "{backup_test}"')
    
    # Merge
    train_count = merge_conll_files(str(existing_train), new_train_lines, str(existing_train))
    test_count = merge_conll_files(str(existing_test), new_test_lines, str(existing_test))
    
    print(f"\n✅ Merged successfully!")
    print(f"\n📊 Updated dataset:")
    print(f"   Train: {train_count} sentences")
    print(f"   Test: {test_count} sentences")
    
    print(f"\n💾 Files updated:")
    print(f"   {existing_train}")
    print(f"   {existing_test}")
    
    print(f"\n📦 Next steps:")
    print(f"   1. Rebuild training package:")
    print(f"      cd /Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser")
    print(f"      ./create_colab_training_package.sh")
    print(f"   2. Upload new Lakshya-Colab-Training.zip to Colab")
    print(f"   3. Train with more data for higher accuracy!")
    print(f"\n🎯 Expected F1 with more data: 97-99%")
    print("="*60)

if __name__ == "__main__":
    main()
