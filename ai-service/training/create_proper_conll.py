#!/usr/bin/env python3
"""
Create proper CoNLL format files with sentence separation
"""

import json
import re
from pathlib import Path

def split_text_into_sentences(text):
    """Split text into sentences using common delimiters"""
    # Common sentence delimiters
    delimiters = ['.', '!', '?', '\n']
    
    sentences = []
    current_sentence = ""
    
    for char in text:
        current_sentence += char
        if char in delimiters:
            # End of sentence
            sentence = current_sentence.strip()
            if sentence:
                sentences.append(sentence)
            current_sentence = ""
    
    # Add last sentence if it doesn't end with delimiter
    if current_sentence.strip():
        sentences.append(current_sentence.strip())
    
    return sentences

def extract_entities_for_sentence(sentence, all_entities):
    """Extract entities that belong to this sentence"""
    sentence_entities = []
    
    for entity in all_entities:
        entity_text = entity['text']
        entity_start = entity.get('start', 0)
        entity_end = entity.get('end', entity_start + len(entity_text))
        entity_label = entity['labels'][0] if entity['labels'] else 'O'
        
        # Check if entity is within sentence bounds
        # This is a simplified approach - in practice, we'd need sentence boundaries
        sentence_entities.append({
            'text': entity_text,
            'label': entity_label,
            'start': entity_start,
            'end': entity_end
        })
    
    return sentence_entities

def sentence_to_conll(sentence, entities):
    """Convert a single sentence to CoNLL format"""
    # Simple tokenization by splitting on whitespace
    tokens = sentence.split()
    
    # For each token, determine if it's part of an entity
    conll_lines = []
    
    # Create a mapping of entity text to labels
    entity_map = {}
    for entity in entities:
        entity_map[entity['text']] = entity['label']
    
    # Process tokens
    for token in tokens:
        # Check if this token matches any entity
        label = 'O'  # Default label
        
        for entity_text, entity_label in entity_map.items():
            # Simple matching - could be improved with position-based matching
            if token.lower() in entity_text.lower() or entity_text.lower() in token.lower():
                label = f"B-{entity_label}"
                break
        
        conll_lines.append(f"{token}\t{label}")
    
    return conll_lines

def json_to_proper_conll(input_file, output_file):
    """Convert JSON to proper CoNLL with sentence separation"""
    print(f"📖 Reading JSON from: {input_file}")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"📊 Processing {len(data)} records...")
    
    conll_lines = []
    total_sentences = 0
    total_tokens = 0
    
    for idx, record in enumerate(data):
        if idx % 1000 == 0:
            print(f"   Processing record {idx}/{len(data)}")
        
        text = record.get('text', '')
        labels = record.get('label', [])
        
        if not text or not labels:
            continue
        
        # Extract entities
        entities = []
        for label_info in labels:
            if 'start' in label_info and 'end' in label_info and 'labels' in label_info:
                entities.append({
                    'text': text[label_info['start']:label_info['end']],
                    'labels': label_info['labels'],
                    'start': label_info['start'],
                    'end': label_info['end']
                })
        
        # Split text into sentences
        sentences = split_text_into_sentences(text)
        
        # Process each sentence
        for sentence in sentences:
            if not sentence.strip():
                continue
            
            # Get entities for this sentence (simplified)
            sentence_entities = extract_entities_for_sentence(sentence, entities)
            
            # Convert sentence to CoNLL
            sentence_conll = sentence_to_conll(sentence, sentence_entities)
            
            # Add to output
            conll_lines.extend(sentence_conll)
            conll_lines.append("")  # Sentence separator
            
            total_sentences += 1
            total_tokens += len(sentence_conll)
    
    # Write CoNLL file
    print(f"💾 Writing CoNLL to: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(conll_lines))
    
    print(f"✅ Conversion completed!")
    print(f"   Total sentences: {total_sentences}")
    print(f"   Total tokens: {total_tokens}")
    
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
        if line:  # Non-empty line (token-label pair)
            current_sentence.append(line)
        else:  # Empty line (sentence boundary)
            if current_sentence:
                sentences.append(current_sentence)
                current_sentence = []
    
    # Add the last sentence if file doesn't end with empty line
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
    """Main function"""
    print("🚀 Creating proper CoNLL format files...")
    
    base_dir = Path(__file__).parent / "data"
    input_file = base_dir / "merged_dataset.json"
    output_file = base_dir / "proper_dataset.conll"
    
    # Convert JSON to proper CoNLL
    conll_file = json_to_proper_conll(input_file, output_file)
    
    # Split into train/val/test
    split_files = split_conll_data(conll_file)
    
    print("✅ Proper CoNLL files created!")
    print("\n📁 Generated files:")
    print(f"   - {conll_file}")
    for _, file_path in split_files:
        print(f"   - {file_path}")

if __name__ == "__main__":
    main()
