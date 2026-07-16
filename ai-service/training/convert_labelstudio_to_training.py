#!/usr/bin/env python3
"""
Convert Label Studio JSON format to DeBERTa training format.
Handles datalabel.json, datalabel1.json, datalabel2.json files.
"""

import json
import random
from pathlib import Path
from typing import List, Dict, Tuple

# Label mapping - convert Label Studio labels to model labels
LABEL_MAPPING = {
    'COMPANY': 'COMPANY',
    'CLIENT': 'CLIENT',
    'ROLE': 'ROLE',
    'LOCATION': 'LOCATION',
    'DATE_START': 'START_DATE',  # Convert DATE_START → START_DATE
    'DATE_END': 'END_DATE',      # Convert DATE_END → END_DATE
    'EDUCATION': 'EDUCATION',
    'INSTITUTION': 'EDUCATION',  # Map INSTITUTION → EDUCATION
    'DEGREE': 'DEGREE',
    'FIELD': 'DEGREE',           # Map FIELD → DEGREE (or create separate label)
    'EDU_YEAR_START': 'START_DATE',  # Education start year
    'EDU_YEAR_END': 'END_DATE',      # Education end year
    'GRADE': 'DEGREE',           # Map GRADE to DEGREE (or ignore)
}

def create_bio_tags_from_labelstudio(text: str, labels: List[Dict]) -> Tuple[List[str], List[str]]:
    """
    Convert Label Studio annotations to BIO-tagged tokens.
    
    Args:
        text: The text content
        labels: List of label dicts with start, end, text, labels
        
    Returns:
        tokens: List of word tokens
        ner_tags: List of BIO tags
    """
    # Simple whitespace tokenization
    words = text.split()
    ner_tags = ['O'] * len(words)
    
    # Calculate character positions for each word
    word_positions = []
    char_pos = 0
    for word in words:
        start = text.find(word, char_pos)
        if start == -1:
            start = char_pos
        end = start + len(word)
        word_positions.append((start, end))
        char_pos = end
    
    # Process each labeled entity
    for label_obj in labels:
        start_char = label_obj['start']
        end_char = label_obj['end']
        label_list = label_obj.get('labels', [])
        
        if not label_list:
            continue
        
        # Get the first label
        original_label = label_list[0]
        
        # Map to model label
        mapped_label = LABEL_MAPPING.get(original_label)
        if not mapped_label:
            continue
        
        # Find words that overlap with this entity
        entity_word_indices = []
        for i, (word_start, word_end) in enumerate(word_positions):
            # Check if word overlaps with entity span
            if word_start < end_char and word_end > start_char:
                entity_word_indices.append(i)
        
        # Assign BIO tags
        for idx, word_idx in enumerate(entity_word_indices):
            if idx == 0:
                ner_tags[word_idx] = f'B-{mapped_label}'
            else:
                ner_tags[word_idx] = f'I-{mapped_label}'
    
    return words, ner_tags

def convert_labelstudio_files(input_files: List[str], output_dir: str, test_split: float = 0.2):
    """
    Convert multiple Label Studio JSON files to training format.
    
    Args:
        input_files: List of paths to Label Studio JSON files
        output_dir: Directory to save train.json and test.json
        test_split: Fraction of data for testing (default 0.2)
    """
    print("="*80)
    print("CONVERTING LABEL STUDIO DATA TO TRAINING FORMAT")
    print("="*80)
    
    all_training_data = []
    total_examples = 0
    skipped = 0
    
    for input_file in input_files:
        print(f"\n📖 Processing: {input_file}")
        
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not isinstance(data, list):
                print(f"   ⚠️  Skipping - not a list format")
                continue
            
            print(f"   Found {len(data)} examples")
            
            for item in data:
                total_examples += 1
                
                try:
                    text = item.get('text', '')
                    labels = item.get('label', [])
                    
                    if not text or not labels:
                        skipped += 1
                        continue
                    
                    # Convert to BIO format
                    tokens, ner_tags = create_bio_tags_from_labelstudio(text, labels)
                    
                    # Skip if no entities were tagged
                    if all(tag == 'O' for tag in ner_tags):
                        skipped += 1
                        continue
                    
                    all_training_data.append({
                        'id': item.get('id', total_examples),
                        'tokens': tokens,
                        'ner_tags': ner_tags
                    })
                    
                except Exception as e:
                    print(f"   ⚠️  Error processing item {item.get('id', '?')}: {e}")
                    skipped += 1
            
        except Exception as e:
            print(f"   ❌ Error reading file: {e}")
    
    print(f"\n{'='*80}")
    print(f"CONVERSION SUMMARY")
    print(f"{'='*80}")
    print(f"Total examples processed: {total_examples}")
    print(f"Successfully converted: {len(all_training_data)}")
    print(f"Skipped: {skipped}")
    
    if not all_training_data:
        print("\n❌ No training data generated!")
        return
    
    # Analyze label distribution
    label_counts = {}
    for item in all_training_data:
        for tag in item['ner_tags']:
            if tag != 'O':
                label_type = tag.split('-')[1] if '-' in tag else tag
                label_counts[label_type] = label_counts.get(label_type, 0) + 1
    
    print(f"\n📊 LABEL DISTRIBUTION:")
    for label, count in sorted(label_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   {label:<15} {count:>6} occurrences")
    
    # Shuffle and split
    random.seed(42)
    random.shuffle(all_training_data)
    
    split_idx = int(len(all_training_data) * (1 - test_split))
    train_data = all_training_data[:split_idx]
    test_data = all_training_data[split_idx:]
    
    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Save train.json
    train_path = output_path / 'train.json'
    with open(train_path, 'w', encoding='utf-8') as f:
        json.dump(train_data, f, indent=2, ensure_ascii=False)
    
    # Save test.json
    test_path = output_path / 'test.json'
    with open(test_path, 'w', encoding='utf-8') as f:
        json.dump(test_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*80}")
    print(f"OUTPUT FILES")
    print(f"{'='*80}")
    print(f"Train: {len(train_data)} examples → {train_path}")
    print(f"Test:  {len(test_data)} examples → {test_path}")
    print(f"\n✅ Conversion complete! Ready for training.")
    print(f"{'='*80}")

def main():
    """Main function"""
    script_dir = Path(__file__).parent
    data_dir = script_dir / 'data'
    
    # Input files
    input_files = [
        data_dir / 'datalabel.json',
        data_dir / 'datalabel1.json',
        data_dir / 'datalabel2.json',
    ]
    
    # Filter to only existing files
    existing_files = [str(f) for f in input_files if f.exists()]
    
    if not existing_files:
        print("❌ Error: No label files found!")
        print(f"   Looking for:")
        for f in input_files:
            print(f"   - {f}")
        return
    
    print(f"Found {len(existing_files)} label files:")
    for f in existing_files:
        print(f"  ✓ {f}")
    
    # Convert
    convert_labelstudio_files(
        input_files=existing_files,
        output_dir=str(data_dir),
        test_split=0.2
    )

if __name__ == "__main__":
    main()
