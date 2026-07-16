"""
Fix label names in training data to match model expectations.
Changes DATE_START -> START_DATE and DATE_END -> END_DATE
"""
import json
import os
from pathlib import Path

def fix_labels_in_file(input_file, output_file=None):
    """Fix label names in a training data file."""
    
    if output_file is None:
        output_file = input_file.replace('.json', '_fixed.json')
    
    print(f"Processing: {input_file}")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Label mapping
    label_mapping = {
        'B-DATE_START': 'B-START_DATE',
        'I-DATE_START': 'I-START_DATE',
        'B-DATE_END': 'B-END_DATE',
        'I-DATE_END': 'I-END_DATE',
        'B-EDU_YEAR_START': 'B-EDU_START_YEAR',
        'I-EDU_YEAR_START': 'I-EDU_START_YEAR',
        'B-EDU_YEAR_END': 'B-EDU_END_YEAR',
        'I-EDU_YEAR_END': 'I-EDU_END_YEAR'
    }
    
    changes_count = 0
    
    # Fix labels in each example
    if isinstance(data, list):
        for example in data:
            if 'labels' in example:
                original_labels = example['labels']
                fixed_labels = []
                
                for label in original_labels:
                    if label in label_mapping:
                        fixed_labels.append(label_mapping[label])
                        changes_count += 1
                    else:
                        fixed_labels.append(label)
                
                example['labels'] = fixed_labels
    
    # Save fixed data
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Fixed {changes_count} labels")
    print(f"✓ Saved to: {output_file}\n")
    
    return changes_count

# Fix all training files
training_dir = Path("/Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser/ai-service/training/data")

files_to_fix = [
    "train.json",
    "test.json"
]

print("="*60)
print("Fixing Label Names in Training Data")
print("="*60 + "\n")

total_changes = 0

for filename in files_to_fix:
    file_path = training_dir / filename
    if file_path.exists():
        try:
            changes = fix_labels_in_file(str(file_path))
            total_changes += changes
        except Exception as e:
            print(f"Error fixing {filename}: {e}\n")

print("="*60)
print(f"Total labels fixed: {total_changes}")
print("="*60)
print("\nNext steps:")
print("1. Verify the fixed files: train_fixed.json and test_fixed.json")
print("2. Retrain your model using the fixed data")
print("3. Test the model - it should now predict START_DATE and END_DATE correctly")
