#!/usr/bin/env python3
"""
Convert Label Studio JSON format to training format.

Input: Label Studio JSON with annotations
Output: train.json and test.json with tokens and ner_tags
"""

import json
import os
from typing import List, Dict, Any
from sklearn.model_selection import train_test_split

# Label mappings
LABEL_MAP = {
    'COMPANY': 'COMPANY',
    'ROLE': 'ROLE',
    'LOCATION': 'LOCATION',
    'DATE_START': 'DATE_START',
    'DATE_END': 'DATE_END',
    'START_DATE': 'DATE_START',  # Handle both formats
    'END_DATE': 'DATE_END',      # Handle both formats
    'CLIENT': 'CLIENT',
    'DEGREE': 'DEGREE',
    'INSTITUTION': 'INSTITUTION',
    'FIELD': 'FIELD',
    'GRADE': 'GRADE',
    'EDU_YEAR_START': 'EDU_YEAR_START',
    'EDU_YEAR_END': 'EDU_YEAR_END'
}

def convert_label_studio_to_ner(data: List[Dict]) -> List[Dict]:
    """Convert Label Studio format to NER training format."""
    converted_data = []
    
    for item in data:
        text = item.get('text', '')
        if not text:
            continue
            
        labels = item.get('label', [])
        
        # Tokenize by whitespace (simple tokenization)
        tokens = text.split()
        
        # Initialize all tokens as 'O' (Outside)
        ner_tags = ['O'] * len(tokens)
        
        # Track character positions for each token
        token_positions = []
        current_pos = 0
        for token in tokens:
            start = text.find(token, current_pos)
            end = start + len(token)
            token_positions.append((start, end))
            current_pos = end
        
        # Apply labels
        for label_info in labels:
            start_char = label_info['start']
            end_char = label_info['end']
            label_type = label_info['labels'][0] if label_info.get('labels') else None
            
            if not label_type or label_type not in LABEL_MAP:
                continue
            
            mapped_label = LABEL_MAP[label_type]
            
            # Find which tokens overlap with this label
            is_first_token = True
            for i, (token_start, token_end) in enumerate(token_positions):
                # Check if token overlaps with label span
                if token_start < end_char and token_end > start_char:
                    if is_first_token:
                        ner_tags[i] = f'B-{mapped_label}'
                        is_first_token = False
                    else:
                        ner_tags[i] = f'I-{mapped_label}'
        
        converted_data.append({
            'tokens': tokens,
            'ner_tags': ner_tags
        })
    
    return converted_data

def merge_and_split_data(file_paths: List[str], test_size: float = 0.2):
    """Load multiple JSON files, merge, and split into train/test."""
    all_data = []
    
    for file_path in file_paths:
        if not os.path.exists(file_path):
            print(f"⚠️  File not found: {file_path}")
            continue
            
        print(f"📁 Loading {file_path}...")
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Convert to NER format
        converted = convert_label_studio_to_ner(data)
        all_data.extend(converted)
        print(f"   ✅ Converted {len(converted)} examples")
    
    print(f"\n📊 Total examples: {len(all_data)}")
    
    # Split into train and test
    train_data, test_data = train_test_split(
        all_data, 
        test_size=test_size, 
        random_state=42
    )
    
    print(f"📊 Train examples: {len(train_data)}")
    print(f"📊 Test examples: {len(test_data)}")
    
    return train_data, test_data

def save_data(train_data: List[Dict], test_data: List[Dict], output_dir: str):
    """Save train and test data to JSON files."""
    os.makedirs(output_dir, exist_ok=True)
    
    train_path = os.path.join(output_dir, 'train.json')
    test_path = os.path.join(output_dir, 'test.json')
    
    with open(train_path, 'w', encoding='utf-8') as f:
        json.dump(train_data, f, indent=2, ensure_ascii=False)
    
    with open(test_path, 'w', encoding='utf-8') as f:
        json.dump(test_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Saved train data to: {train_path}")
    print(f"✅ Saved test data to: {test_path}")

def main():
    """Main function to prepare training data."""
    print("🚀 Preparing training data from Label Studio annotations")
    print("=" * 60)
    
    # Define input files
    data_dir = os.path.dirname(os.path.abspath(__file__))
    input_files = [
        os.path.join(data_dir, 'data', '548_lable.json'),
        os.path.join(data_dir, 'data', 'project-11-at-2026-04-08-15-38-a8419544.json'),
        os.path.join(data_dir, 'data', 'project-12-at-2026-04-08-15-46-22c9eaca.json'),
    ]
    
    # Merge and split data
    train_data, test_data = merge_and_split_data(input_files, test_size=0.2)
    
    # Save to output directory
    output_dir = os.path.join(data_dir, 'data')
    save_data(train_data, test_data, output_dir)
    
    # Print sample
    print("\n📝 Sample training example:")
    print("-" * 60)
    if train_data:
        sample = train_data[0]
        print(f"Tokens: {' '.join(sample['tokens'][:10])}...")
        print(f"Tags:   {' '.join(sample['ner_tags'][:10])}...")
    
    print("\n🎉 Data preparation complete!")
    print(f"Next step: Run 'python training/train.py' to train the model")

if __name__ == "__main__":
    main()
