#!/usr/bin/env python3
"""
Convert Doccano JSONL format to training format for DeBERTa-v3 NER model.

Input: dataset.jsonl (Doccano format)
Output: train.json and test.json (80/20 split)
"""

import json
import random
from pathlib import Path
from typing import List, Dict, Tuple

# Entity label mapping from Doccano to BIO format
# Maps various Doccano label formats to standardized entity types
# Note: PERSON/NAME entities excluded - handled separately with regex
ENTITY_MAPPING = {
    # Person/Name mappings - REMOVED (handled with regex)
    # 'PERSON_NAME': 'PERSON',
    # 'NAME': 'PERSON',
    # 'PERSON': 'PERSON',
    # 'CANDIDATE_NAME': 'PERSON',
    
    # Company mappings
    'COMPANY_NAME': 'COMPANY',
    'COMPANY': 'COMPANY',
    'ORGANIZATION': 'COMPANY',
    'ORG': 'COMPANY',
    'EMPLOYER': 'COMPANY',
    
    # Client mappings
    'CLIENT': 'CLIENT',
    'CLIENT_NAME': 'CLIENT',
    'CUSTOMER': 'CLIENT',
    
    # Role/Title mappings
    'JOB_TITLE': 'ROLE',
    'TITLE': 'ROLE',
    'ROLE': 'ROLE',
    'POSITION': 'ROLE',
    'DESIGNATION': 'ROLE',
    
    # Location mappings
    'LOCATION': 'LOCATION',
    'LOC': 'LOCATION',
    'CITY': 'LOCATION',
    'COUNTRY': 'LOCATION',
    'ADDRESS': 'LOCATION',
    
    # Date mappings
    'START_DATE': 'START_DATE',
    'END_DATE': 'END_DATE',
    'DATE': 'START_DATE',  # Default dates to START_DATE
    'DURATION': 'START_DATE',
    
    # Education mappings
    'EDUCATION': 'EDUCATION',
    'EDU': 'EDUCATION',
    'UNIVERSITY': 'EDUCATION',
    'COLLEGE': 'EDUCATION',
    'COLLEGE_NAME': 'EDUCATION',
    'SCHOOL': 'EDUCATION',
    'INSTITUTE': 'EDUCATION',
    
    # Degree mappings
    'DEGREE': 'DEGREE',
    'QUALIFICATION': 'DEGREE',
    'DIPLOMA': 'DEGREE',
    'CERTIFICATION': 'DEGREE',
    'CERT': 'DEGREE',
}

def tokenize_text(text: str) -> List[str]:
    """Simple whitespace tokenization"""
    return text.split()

def create_bio_tags(text: str, entities: List[List]) -> Tuple[List[str], List[str]]:
    """
    Convert Doccano entities to BIO-tagged tokens.
    
    Args:
        text: Resume text
        entities: List of [start, end, label] from Doccano
        
    Returns:
        tokens: List of tokens
        ner_tags: List of BIO tags
    """
    tokens = tokenize_text(text)
    ner_tags = ['O'] * len(tokens)
    
    # Calculate character positions for each token
    token_positions = []
    char_pos = 0
    for token in tokens:
        start = text.find(token, char_pos)
        if start == -1:
            start = char_pos
        end = start + len(token)
        token_positions.append((start, end))
        char_pos = end
    
    # Assign BIO tags based on entity spans
    for entity in entities:
        start_char, end_char, label = entity
        
        # Map label to standard format
        mapped_label = ENTITY_MAPPING.get(label, None)
        if not mapped_label:
            continue
        
        # Find tokens that overlap with this entity
        entity_tokens = []
        for i, (tok_start, tok_end) in enumerate(token_positions):
            # Check if token overlaps with entity
            if tok_start < end_char and tok_end > start_char:
                entity_tokens.append(i)
        
        # Assign B- and I- tags
        for idx, token_idx in enumerate(entity_tokens):
            if idx == 0:
                ner_tags[token_idx] = f'B-{mapped_label}'
            else:
                ner_tags[token_idx] = f'I-{mapped_label}'
    
    return tokens, ner_tags

def convert_doccano_to_training_format(input_file: str, output_dir: str, test_split: float = 0.2):
    """
    Convert Doccano JSONL to training format and split into train/test.
    
    Args:
        input_file: Path to dataset.jsonl
        output_dir: Directory to save train.json and test.json
        test_split: Fraction of data to use for testing (default 0.2)
    """
    print(f"📖 Reading Doccano dataset from: {input_file}")
    
    # Read Doccano JSONL
    examples = []
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                examples.append(json.loads(line))
    
    print(f"✅ Loaded {len(examples)} examples")
    
    # Convert to training format
    training_data = []
    skipped = 0
    
    for idx, example in enumerate(examples):
        try:
            text = example.get('text', '')
            entities = example.get('labels', example.get('entities', []))
            
            if not text or not entities:
                skipped += 1
                continue
            
            # Convert entities from object format to array format
            # Handle both formats: [start, end, label] and {start_offset, end_offset, label}
            entity_list = []
            for entity in entities:
                if isinstance(entity, dict):
                    # Object format: {id, label, start_offset, end_offset}
                    start = entity.get('start_offset', entity.get('start', 0))
                    end = entity.get('end_offset', entity.get('end', 0))
                    label = entity.get('label', '')
                    entity_list.append([start, end, label])
                elif isinstance(entity, (list, tuple)) and len(entity) >= 3:
                    # Array format: [start, end, label]
                    entity_list.append(entity[:3])
            
            if not entity_list:
                skipped += 1
                continue
            
            # Convert to BIO format
            tokens, ner_tags = create_bio_tags(text, entity_list)
            
            training_data.append({
                'id': example.get('id', idx),
                'tokens': tokens,
                'ner_tags': ner_tags
            })
            
        except Exception as e:
            print(f"⚠️  Skipping example {idx}: {e}")
            skipped += 1
    
    print(f"✅ Converted {len(training_data)} examples ({skipped} skipped)")
    
    # Shuffle and split
    random.seed(42)
    random.shuffle(training_data)
    
    split_idx = int(len(training_data) * (1 - test_split))
    train_data = training_data[:split_idx]
    test_data = training_data[split_idx:]
    
    # Save train.json
    train_path = Path(output_dir) / 'train.json'
    with open(train_path, 'w', encoding='utf-8') as f:
        json.dump(train_data, f, indent=2, ensure_ascii=False)
    
    # Save test.json
    test_path = Path(output_dir) / 'test.json'
    with open(test_path, 'w', encoding='utf-8') as f:
        json.dump(test_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n📊 Dataset Split:")
    print(f"   Train: {len(train_data)} examples → {train_path}")
    print(f"   Test:  {len(test_data)} examples → {test_path}")
    print(f"\n✅ Conversion complete!")

def main():
    """Main function"""
    import os
    
    # Paths
    script_dir = Path(__file__).parent
    input_file = script_dir / 'data' / 'dataset.jsonl'
    output_dir = script_dir / 'data'
    
    if not input_file.exists():
        print(f"❌ Error: {input_file} not found!")
        print(f"   Please ensure dataset.jsonl is in the data/ directory")
        return
    
    # Convert
    convert_doccano_to_training_format(
        input_file=str(input_file),
        output_dir=str(output_dir),
        test_split=0.2
    )

if __name__ == "__main__":
    main()
