#!/usr/bin/env python3
"""
Comprehensive validation of all training files before Colab upload.
Validates label files, converted data, and training script.
"""

import json
from pathlib import Path
from collections import Counter, defaultdict

def validate_label_files():
    """Validate original Label Studio files."""
    print("="*70)
    print("📋 VALIDATING LABEL FILES (Label Studio Format)")
    print("="*70)
    
    label_files = [
        Path(__file__).parent / "data" / "label1.json",
        Path(__file__).parent / "data" / "label2.json",
        Path(__file__).parent / "data" / "label3.json"
    ]
    
    all_entity_counts = Counter()
    total_examples = 0
    
    for label_file in label_files:
        if not label_file.exists():
            print(f"❌ {label_file.name} not found!")
            continue
            
        with open(label_file, 'r') as f:
            data = json.load(f)
        
        print(f"\n📁 {label_file.name}:")
        print(f"   Examples: {len(data):,}")
        
        # Validate structure
        first_ex = data[0]
        required_keys = ['text', 'label', 'id']
        missing_keys = [k for k in required_keys if k not in first_ex]
        if missing_keys:
            print(f"   ⚠️  Missing keys: {missing_keys}")
        else:
            print(f"   ✅ Structure valid")
        
        # Count entities
        entity_counts = Counter()
        for ex in data:
            for label_obj in ex.get('label', []):
                entity_type = label_obj['labels'][0] if label_obj.get('labels') else 'UNKNOWN'
                entity_counts[entity_type] += 1
                all_entity_counts[entity_type] += 1
        
        print(f"   Top entities: {', '.join([f'{k}({v})' for k, v in entity_counts.most_common(3)])}")
        total_examples += len(data)
    
    print(f"\n📊 Combined Statistics:")
    print(f"   Total examples: {total_examples:,}")
    print(f"   Total entities: {sum(all_entity_counts.values()):,}")
    print(f"\n   Entity Distribution:")
    for entity, count in sorted(all_entity_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"     {entity:20s}: {count:,}")
    
    return all_entity_counts

def validate_converted_data():
    """Validate converted BIO format data."""
    print("\n" + "="*70)
    print("🔄 VALIDATING CONVERTED DATA (BIO Token Format)")
    print("="*70)
    
    train_path = Path(__file__).parent / "data" / "train.json"
    test_path = Path(__file__).parent / "data" / "test.json"
    
    issues = []
    
    for data_path in [train_path, test_path]:
        if not data_path.exists():
            print(f"❌ {data_path.name} not found!")
            issues.append(f"{data_path.name} missing")
            continue
        
        with open(data_path, 'r') as f:
            data = json.load(f)
        
        print(f"\n📁 {data_path.name}:")
        print(f"   Examples: {len(data):,}")
        
        # Validate structure
        first_ex = data[0]
        required_keys = ['tokens', 'labels']
        missing_keys = [k for k in required_keys if k not in first_ex]
        
        if missing_keys:
            print(f"   ❌ Missing keys: {missing_keys}")
            issues.append(f"{data_path.name} missing keys: {missing_keys}")
        else:
            print(f"   ✅ Structure valid")
        
        # Validate token-label alignment
        misaligned = 0
        for ex in data:
            if len(ex['tokens']) != len(ex['labels']):
                misaligned += 1
        
        if misaligned > 0:
            print(f"   ⚠️  {misaligned} examples with misaligned tokens/labels")
            issues.append(f"{data_path.name} has {misaligned} misaligned examples")
        else:
            print(f"   ✅ All tokens aligned with labels")
        
        # Count label types
        label_counts = Counter()
        for ex in data:
            for label in ex['labels']:
                label_counts[label] += 1
        
        # Count entity types (B- tags only)
        entity_counts = Counter()
        for label in label_counts:
            if label.startswith('B-'):
                entity_type = label.split('-')[1]
                entity_counts[entity_type] = label_counts[label]
        
        print(f"   Entity types: {len(entity_counts)}")
        print(f"   Top entities: {', '.join([f'{k}({v})' for k, v in entity_counts.most_common(3)])}")
        
        # Check for rare entities
        total_entities = sum(entity_counts.values())
        rare_entities = []
        for entity, count in entity_counts.items():
            coverage = count / len(data) * 100
            if coverage < 5.0:
                rare_entities.append((entity, count, coverage))
        
        if rare_entities:
            print(f"   ⚠️  Rare entities (< 5% coverage):")
            for entity, count, coverage in sorted(rare_entities, key=lambda x: x[2]):
                print(f"      - {entity}: {count} ({coverage:.1f}%)")
                if entity == 'PERSON_NAME':
                    print(f"        💡 Class weighting enabled for this entity")
    
    return issues

def validate_training_script():
    """Validate training script configuration."""
    print("\n" + "="*70)
    print("🔧 VALIDATING TRAINING SCRIPT")
    print("="*70)
    
    script_path = Path(__file__).parent / "data" / "colab_train.py"
    
    if not script_path.exists():
        print("❌ colab_train.py not found!")
        return ["colab_train.py missing"]
    
    with open(script_path, 'r') as f:
        script_content = f.read()
    
    issues = []
    
    # Check for correct field names
    if '"ner_tags"' in script_content:
        print("❌ Script still uses 'ner_tags' instead of 'labels'")
        issues.append("Script uses wrong field name: 'ner_tags'")
    else:
        print("✅ Script uses correct field name: 'labels'")
    
    # Check for class weighting
    if 'class_weights' in script_content and 'WeightedTrainer' in script_content:
        print("✅ Class weighting enabled for imbalanced entities")
    else:
        print("⚠️  Class weighting not found")
    
    # Check for GPU support
    if 'bf16=torch.cuda.is_available()' in script_content:
        print("✅ BF16 precision enabled for GPU")
    else:
        print("⚠️  BF16 not configured")
    
    # Check label count
    if 'LABELS = [' in script_content:
        # Extract LABELS list
        start = script_content.find('LABELS = [')
        end = script_content.find(']', start) + 1
        labels_str = script_content[start:end]
        num_labels = labels_str.count("'")
        print(f"✅ Script configured for {num_labels} labels")
    
    return issues

def validate_package():
    """Validate the training package ZIP."""
    print("\n" + "="*70)
    print("📦 VALIDATING TRAINING PACKAGE")
    print("="*70)
    
    zip_path = Path(__file__).parent / "data" / "Lakshya-Colab-Training.zip"
    
    if not zip_path.exists():
        print("❌ Lakshya-Colab-Training.zip not found!")
        return ["ZIP package missing"]
    
    import zipfile
    
    required_files = ['train.json', 'test.json', 'colab_train.py']
    
    with zipfile.ZipFile(zip_path, 'r') as zf:
        zip_files = zf.namelist()
        
        print(f"✅ ZIP file exists: {zip_path.name}")
        print(f"   Size: {zip_path.stat().st_size / (1024*1024):.1f} MB")
        print(f"   Files: {', '.join(zip_files)}")
        
        missing = [f for f in required_files if f not in zip_files]
        if missing:
            print(f"❌ Missing files in ZIP: {missing}")
            return [f"ZIP missing: {missing}"]
        else:
            print(f"✅ All required files present")
    
    return []

def main():
    """Run all validations."""
    print("\n" + "🔍 COMPREHENSIVE TRAINING FILES VALIDATION")
    print("="*70 + "\n")
    
    all_issues = []
    
    # 1. Validate label files
    try:
        entity_counts = validate_label_files()
    except Exception as e:
        print(f"❌ Label file validation failed: {e}")
        all_issues.append(f"Label validation error: {e}")
    
    # 2. Validate converted data
    try:
        issues = validate_converted_data()
        all_issues.extend(issues)
    except Exception as e:
        print(f"❌ Converted data validation failed: {e}")
        all_issues.append(f"Data validation error: {e}")
    
    # 3. Validate training script
    try:
        issues = validate_training_script()
        all_issues.extend(issues)
    except Exception as e:
        print(f"❌ Training script validation failed: {e}")
        all_issues.append(f"Script validation error: {e}")
    
    # 4. Validate package
    try:
        issues = validate_package()
        all_issues.extend(issues)
    except Exception as e:
        print(f"❌ Package validation failed: {e}")
        all_issues.append(f"Package validation error: {e}")
    
    # Summary
    print("\n" + "="*70)
    print("📊 VALIDATION SUMMARY")
    print("="*70)
    
    if all_issues:
        print(f"\n⚠️  Found {len(all_issues)} issue(s):")
        for i, issue in enumerate(all_issues, 1):
            print(f"   {i}. {issue}")
        print("\n❌ Please fix issues before uploading to Colab")
    else:
        print("\n✅ ALL VALIDATIONS PASSED!")
        print("\n🚀 Ready to upload to Colab:")
        print("   1. Upload Lakshya-Colab-Training.zip")
        print("   2. Extract: !unzip -o Lakshya-Colab-Training.zip")
        print("   3. Train: !python colab_train.py")
        print("\n📈 Expected results:")
        print("   - Training time: ~35 min (GPU) or ~3-4 hours (CPU)")
        print("   - Target F1 score: 0.75-0.85")
        print("   - PERSON_NAME will have lower F1 (0.50-0.65) due to rarity")

if __name__ == "__main__":
    main()
