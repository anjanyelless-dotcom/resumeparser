"""
Analyze training data to identify label distribution and potential issues.
"""
import json
from collections import Counter
import os

def analyze_training_data(file_path):
    """Analyze label distribution in training data."""
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"\n{'='*60}")
    print(f"Analyzing: {os.path.basename(file_path)}")
    print(f"{'='*60}\n")
    
    # Count total examples
    total_examples = len(data) if isinstance(data, list) else 1
    print(f"Total examples: {total_examples}\n")
    
    # Count labels
    label_counter = Counter()
    date_examples = []
    
    if isinstance(data, list):
        for idx, example in enumerate(data):
            if 'labels' in example:
                labels = example['labels']
                label_counter.update(labels)
                
                # Check for date labels
                if any('DATE' in str(label) or 'START' in str(label) or 'END' in str(label) for label in labels):
                    date_examples.append({
                        'index': idx,
                        'text': example.get('text', '')[:100],
                        'labels': labels
                    })
    
    # Print label distribution
    print("Label Distribution:")
    print("-" * 60)
    for label, count in sorted(label_counter.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / sum(label_counter.values())) * 100
        print(f"{label:30s}: {count:6d} ({percentage:5.2f}%)")
    
    print(f"\n{'='*60}")
    print(f"Total labels: {sum(label_counter.values())}")
    print(f"{'='*60}\n")
    
    # Check for date-related labels
    date_labels = [label for label in label_counter.keys() if 'DATE' in str(label) or 'START' in str(label) or 'END' in str(label)]
    
    if date_labels:
        print(f"\nDate-related labels found: {date_labels}")
        print(f"Total date label occurrences: {sum(label_counter[label] for label in date_labels)}")
        print(f"\nSample date examples (first 5):")
        for ex in date_examples[:5]:
            print(f"\nExample {ex['index']}:")
            print(f"Text: {ex['text']}...")
            print(f"Labels: {ex['labels'][:20]}...")
    else:
        print("\n⚠️  WARNING: No date-related labels found in training data!")
        print("This explains why your model doesn't predict dates.")
    
    # Check label format (BIO vs simple)
    print(f"\n{'='*60}")
    print("Label Format Analysis:")
    print("-" * 60)
    
    has_bio = any(str(label).startswith('B-') or str(label).startswith('I-') for label in label_counter.keys())
    has_simple = any(not str(label).startswith(('B-', 'I-', 'O')) for label in label_counter.keys())
    
    if has_bio:
        print("✓ BIO format detected (B-, I- prefixes)")
    if has_simple:
        print("✓ Simple format detected (no prefixes)")
    
    if has_bio and has_simple:
        print("\n⚠️  WARNING: Mixed label formats detected!")
        print("This can cause training issues. Use consistent BIO format.")

# Analyze all training files
training_dir = "/Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser/ai-service/training/data"

files_to_check = [
    "train.json",
    "test.json",
    "datalabel.json",
    "label1.json"
]

for filename in files_to_check:
    file_path = os.path.join(training_dir, filename)
    if os.path.exists(file_path):
        try:
            analyze_training_data(file_path)
        except Exception as e:
            print(f"Error analyzing {filename}: {e}")
        print("\n" + "="*80 + "\n")
