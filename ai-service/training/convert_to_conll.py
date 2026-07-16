#!/usr/bin/env python3
"""
Convert merged JSON dataset to CoNLL format for DeBERTa training
"""

import json
import re
from pathlib import Path

def clean_text(text):
    """Clean and normalize text"""
    if not text:
        return ""
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Fix common formatting issues
    text = text.replace('|', ' ')  # Convert pipe separators to spaces
    text = text.replace('::', ' : ')  # Separate double colons
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)  # Add space between camelCase
    
    return text

def extract_entities_from_labels(text, labels):
    """Extract entities with their positions from label annotations"""
    entities = []
    
    for label_info in labels:
        if 'start' in label_info and 'end' in label_info and 'labels' in label_info:
            start = label_info['start']
            end = label_info['end']
            entity_text = text[start:end]
            
            for label in label_info['labels']:
                entities.append({
                    'text': entity_text,
                    'label': label,
                    'start': start,
                    'end': end
                })
    
    return entities

def text_to_tokens_with_labels(text, entities):
    """Convert text to tokens with BIO labels"""
    if not text:
        return []
    
    # Clean text
    text = clean_text(text)
    
    # Sort entities by start position
    entities = sorted(entities, key=lambda x: x['start'])
    
    tokens = []
    labels = []
    
    i = 0
    entity_idx = 0
    
    while i < len(text):
        # Check if we're at the start of an entity
        if entity_idx < len(entities) and i == entities[entity_idx]['start']:
            entity = entities[entity_idx]
            entity_text = entity['text']
            entity_label = entity['label']
            
            # Tokenize the entity text
            entity_tokens = entity_text.split()
            
            # Add tokens with BIO labels
            for j, token in enumerate(entity_tokens):
                if j == 0:
                    labels.append(f"B-{entity_label}")
                else:
                    labels.append(f"I-{entity_label}")
                tokens.append(token)
            
            # Move to end of entity
            i = entity['end']
            entity_idx += 1
        else:
            # Skip whitespace
            if text[i].isspace():
                i += 1
                continue
            
            # Extract next word
            word_end = i
            while word_end < len(text) and not text[word_end].isspace():
                word_end += 1
            
            word = text[i:word_end]
            tokens.append(word)
            labels.append("O")
            
            i = word_end
    
    return list(zip(tokens, labels))

def json_to_conll(input_file, output_file):
    """Convert JSON dataset to CoNLL format"""
    print(f"📖 Reading JSON from: {input_file}")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"📊 Processing {len(data)} records...")
    
    conll_lines = []
    total_tokens = 0
    entity_stats = {}
    
    for idx, record in enumerate(data):
        if idx % 100 == 0:
            print(f"   Processing record {idx}/{len(data)}")
        
        text = record.get('text', '')
        labels = record.get('label', [])
        
        if not text or not labels:
            continue
        
        # Extract entities
        entities = extract_entities_from_labels(text, labels)
        
        # Convert to tokens with labels
        token_labels = text_to_tokens_with_labels(text, entities)
        
        # Add to CoNLL format
        for token, label in token_labels:
            conll_lines.append(f"{token}\t{label}")
            total_tokens += 1
            
            # Count entities for statistics
            if label != 'O':
                entity_type = label[2:]  # Remove B- or I- prefix
                entity_stats[entity_type] = entity_stats.get(entity_type, 0) + 1
        
        # Add sentence separator
        conll_lines.append("")
    
    # Write CoNLL file
    print(f"💾 Writing CoNLL to: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(conll_lines))
    
    print(f"✅ Conversion completed!")
    print(f"   Total tokens: {total_tokens}")
    print(f"   Total sentences: {len([line for line in conll_lines if line == ''])}")
    
    print(f"\n📈 Entity Statistics:")
    for entity_type, count in sorted(entity_stats.items()):
        print(f"   {entity_type}: {count}")
    
    return output_file

def split_conll_data(conll_file, train_ratio=0.8, val_ratio=0.1, test_ratio=0.1):
    """Split CoNLL data into train/val/test sets"""
    print(f"📂 Splitting CoNLL data from: {conll_file}")
    
    with open(conll_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Split into sentences (empty lines separate sentences)
    sentences = []
    current_sentence = []
    
    for line in lines:
        line = line.strip()
        if line:
            current_sentence.append(line)
        else:
            if current_sentence:
                sentences.append(current_sentence)
                current_sentence = []
    
    # Add last sentence if file doesn't end with empty line
    if current_sentence:
        sentences.append(current_sentence)
    
    print(f"📊 Total sentences: {len(sentences)}")
    
    # Calculate split indices
    total = len(sentences)
    train_end = int(total * train_ratio)
    val_end = train_end + int(total * val_ratio)
    
    # Split sentences
    train_sentences = sentences[:train_end]
    val_sentences = sentences[train_end:val_end]
    test_sentences = sentences[val_end:]
    
    print(f"   Train: {len(train_sentences)} sentences")
    print(f"   Val:   {len(val_sentences)} sentences")
    print(f"   Test:  {len(test_sentences)} sentences")
    
    # Write split files
    base_dir = Path(conll_file).parent
    base_name = Path(conll_file).stem
    
    splits = [
        (train_sentences, base_dir / f"{base_name}_train.conll"),
        (val_sentences, base_dir / f"{base_name}_val.conll"),
        (test_sentences, base_dir / f"{base_name}_test.conll")
    ]
    
    for sentences, output_path in splits:
        with open(output_path, 'w', encoding='utf-8') as f:
            for sentence in sentences:
                f.write('\n'.join(sentence))
                f.write('\n')
        
        print(f"💾 Saved: {output_path}")
    
    return splits

def main():
    """Main conversion pipeline"""
    print("🚀 Starting JSON to CoNLL conversion...")
    
    # Paths
    base_dir = Path(__file__).parent / "data"
    input_file = base_dir / "merged_dataset.json"
    output_file = base_dir / "dataset.conll"
    
    # Convert JSON to CoNLL
    conll_file = json_to_conll(input_file, output_file)
    
    # Split into train/val/test
    split_files = split_conll_data(conll_file)
    
    print("✅ JSON to CoNLL conversion completed!")
    print("\n📁 Generated files:")
    print(f"   - {conll_file}")
    for _, file_path in split_files:
        print(f"   - {file_path}")

if __name__ == "__main__":
    main()
