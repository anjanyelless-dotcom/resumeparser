#!/usr/bin/env python3
"""
Fix train.json and test.json by converting string NER tags to integer IDs.
"""

import json
from pathlib import Path

# Label mapping - must match the training script
LABELS = [
    "O",
    "B-NAME", "I-NAME",
    "B-EMAIL", "I-EMAIL",
    "B-PHONE", "I-PHONE",
    "B-EDUCATION", "I-EDUCATION",
    "B-EXPERIENCE", "I-EXPERIENCE",
    "B-SKILLS", "I-SKILLS",
    "B-CERTIFICATION", "I-CERTIFICATION"
]

# Create label to ID mapping
label2id = {label: i for i, label in enumerate(LABELS)}

# Additional mappings for variations
LABEL_VARIATIONS = {
    "B-TITLE": "B-EXPERIENCE",
    "I-TITLE": "I-EXPERIENCE",
    "B-ORG": "B-EXPERIENCE",
    "I-ORG": "I-EXPERIENCE",
    "B-EDU": "B-EDUCATION",
    "I-EDU": "I-EDUCATION",
    "B-SKILL": "B-SKILLS",
    "I-SKILL": "I-SKILLS",
    "B-DATE": "O",
    "I-DATE": "O",
    "B-LOC": "O",
    "I-LOC": "O",
    "B-CERT": "B-CERTIFICATION",
    "I-CERT": "I-CERTIFICATION",
}

def normalize_label(label: str) -> str:
    """Normalize label variations to standard labels"""
    if label in LABELS:
        return label
    if label in LABEL_VARIATIONS:
        return LABEL_VARIATIONS[label]
    print(f"Warning: Unknown label '{label}', mapping to 'O'")
    return "O"

def convert_string_tags_to_ids(data: list) -> list:
    """Convert string NER tags to integer IDs"""
    converted_data = []
    
    for example in data:
        # Check if ner_tags are already integers
        if example["ner_tags"] and isinstance(example["ner_tags"][0], int):
            converted_data.append(example)
            continue
        
        # Convert string tags to IDs
        tag_ids = []
        for tag in example["ner_tags"]:
            normalized_tag = normalize_label(tag)
            tag_id = label2id[normalized_tag]
            tag_ids.append(tag_id)
        
        converted_example = {
            "id": example["id"],
            "tokens": example["tokens"],
            "ner_tags": tag_ids
        }
        converted_data.append(converted_example)
    
    return converted_data

def main():
    """Fix train.json and test.json files"""
    data_dir = Path("data")
    
    # Process train.json
    train_file = data_dir / "train.json"
    print(f"📂 Loading {train_file}...")
    with open(train_file, 'r') as f:
        train_data = json.load(f)
    
    print(f"✅ Loaded {len(train_data)} training examples")
    print(f"🔧 Converting string tags to integer IDs...")
    
    train_data_fixed = convert_string_tags_to_ids(train_data)
    
    # Save fixed train.json
    with open(train_file, 'w') as f:
        json.dump(train_data_fixed, f, indent=2)
    print(f"✅ Fixed {train_file}")
    
    # Process test.json
    test_file = data_dir / "test.json"
    print(f"\n📂 Loading {test_file}...")
    with open(test_file, 'r') as f:
        test_data = json.load(f)
    
    print(f"✅ Loaded {len(test_data)} test examples")
    print(f"🔧 Converting string tags to integer IDs...")
    
    test_data_fixed = convert_string_tags_to_ids(test_data)
    
    # Save fixed test.json
    with open(test_file, 'w') as f:
        json.dump(test_data_fixed, f, indent=2)
    print(f"✅ Fixed {test_file}")
    
    # Show example
    print("\n" + "="*50)
    print("📊 Example from fixed train.json:")
    print("="*50)
    example = train_data_fixed[0]
    print(f"ID: {example['id']}")
    print(f"Tokens (first 10): {example['tokens'][:10]}")
    print(f"NER Tags (first 10): {example['ner_tags'][:10]}")
    print(f"Tag types: {type(example['ner_tags'][0])}")
    print("="*50)
    
    print("\n✅ All files fixed! You can now run training in Colab.")

if __name__ == "__main__":
    main()
