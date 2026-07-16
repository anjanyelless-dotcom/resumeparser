#!/usr/bin/env python3
"""
Convert Label Studio JSON-MIN export to CoNLL format for NER training.
Handles BIO tagging for resume entity extraction.
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Tuple


def load_json_files(raw_dir: str) -> List[Dict]:
    """Load all JSON files from the raw directory."""
    json_files = []
    raw_path = Path(raw_dir)
    
    for file_path in raw_path.glob("*.json"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    json_files.extend(data)
                else:
                    json_files.append(data)
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
    
    return json_files


def create_bio_mapping(text: str, labels: List[Dict]) -> List[Tuple[str, str]]:
    """Create BIO tagging mapping for tokens in text."""
    # Initialize all tokens as 'O' (Outside)
    tokens = text.split()
    bio_tags = ['O'] * len(tokens)
    
    # Create character to token mapping
    char_positions = []
    current_pos = 0
    
    for i, token in enumerate(tokens):
        token_start = text.find(token, current_pos)
        if token_start != -1:
            token_end = token_start + len(token)
            char_positions.append((token_start, token_end, i))
            current_pos = token_end
        else:
            char_positions.append((0, 0, i))
    
    # Process each label
    for label_info in labels:
        label_start = label_info['start']
        label_end = label_info['end']
        label_text = label_info['text']
        label_name = label_info['labels'][0] if label_info['labels'] else 'O'
        
        # Find tokens that overlap with this label
        first_token = True
        for token_start, token_end, token_idx in char_positions:
            if token_start == 0 and token_end == 0:
                continue
                
            # Check if token overlaps with label
            if (token_start < label_end and token_end > label_start):
                if first_token:
                    bio_tags[token_idx] = f"B-{label_name}"
                    first_token = False
                else:
                    bio_tags[token_idx] = f"I-{label_name}"
    
    return list(zip(tokens, bio_tags))


def convert_to_conll(json_data: List[Dict], output_file: str) -> int:
    """Convert JSON data to CoNLL format."""
    converted_count = 0
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for item in json_data:
            try:
                text = item['text']
                labels = item.get('label', [])
                
                # Create BIO mapping
                token_label_pairs = create_bio_mapping(text, labels)
                
                # Write CoNLL format
                for token, label in token_label_pairs:
                    f.write(f"{token}\t{label}\n")
                
                # Add blank line between resumes
                f.write("\n")
                converted_count += 1
                
            except Exception as e:
                print(f"Error processing item: {e}")
                continue
    
    return converted_count


def main():
    """Main conversion function."""
    # Define paths
    raw_dir = "data/raw"
    output_dir = "data/converted"
    output_file = os.path.join(output_dir, "dataset.conll")
    
    # Create output directory if it doesn't exist
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    print("Loading JSON files from data/raw...")
    json_data = load_json_files(raw_dir)
    
    if not json_data:
        print("No JSON data found in data/raw directory!")
        return
    
    print(f"Found {len(json_data)} resume entries")
    
    print("Converting to CoNLL format...")
    converted_count = convert_to_conll(json_data, output_file)
    
    print(f"Successfully converted {converted_count} resumes")
    print(f"CoNLL file saved to: {output_file}")
    
    # Show some statistics
    with open(output_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        token_count = sum(1 for line in lines if line.strip() and '\t' in line)
        blank_lines = sum(1 for line in lines if not line.strip())
        
    print(f"Total tokens: {token_count}")
    print(f"Total resumes (blank lines): {blank_lines}")


if __name__ == "__main__":
    main()
