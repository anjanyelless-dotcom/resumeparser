#!/usr/bin/env python3
"""
Merge synthetic data with existing real data for training
"""

import json
import os
from pathlib import Path

def load_json_file(file_path):
    """Load JSON file with error handling"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return []

def merge_datasets():
    """Merge all JSON datasets"""
    
    # File paths
    base_dir = Path(__file__).parent / "data"
    
    files_to_merge = [
        "synthetic_data.json",
        "final_labeldata.json", 
        "final_labeldata1.json",
        "final_labeldata2.json"
    ]
    
    all_data = []
    
    # Load and merge all files
    for file_name in files_to_merge:
        file_path = base_dir / file_name
        
        if file_path.exists():
            print(f"📂 Loading {file_name}...")
            data = load_json_file(file_path)
            
            if isinstance(data, list):
                all_data.extend(data)
                print(f"   ✅ Added {len(data)} records")
            else:
                print(f"   ⚠️  Expected list, got {type(data)}")
        else:
            print(f"   ❌ File not found: {file_path}")
    
    print(f"\n📊 Total merged records: {len(all_data)}")
    
    # Save merged dataset
    output_path = base_dir / "merged_dataset.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Saved merged dataset to: {output_path}")
    
    # Analyze label distribution
    analyze_labels(all_data)
    
    return all_data

def analyze_labels(data):
    """Analyze label distribution in merged dataset"""
    print("\n📈 Label Distribution Analysis:")
    print("-" * 40)
    
    label_counts = {}
    entity_counts = {}
    
    for record in data:
        if 'label' in record and isinstance(record['label'], list):
            for label_info in record['label']:
                if 'labels' in label_info:
                    for label in label_info['labels']:
                        label_counts[label] = label_counts.get(label, 0) + 1
                        entity_counts[label] = entity_counts.get(label, 0) + 1
    
    # Print distribution
    for label, count in sorted(label_counts.items()):
        print(f"{label:<20}: {count:>5} ({count/len(data)*100:.1f}%)")
    
    print(f"\nTotal entities: {sum(entity_counts.values())}")
    print(f"Total records: {len(data)}")
    
    return label_counts

if __name__ == "__main__":
    print("🚀 Starting dataset merge...")
    merged_data = merge_datasets()
    print("✅ Dataset merge completed!")
