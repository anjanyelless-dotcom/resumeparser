#!/usr/bin/env python3
"""
Verify training data labels are correct before retraining
"""

import json
from collections import Counter, defaultdict
from pathlib import Path

def verify_bio_tagging(conll_file):
    """Check if BIO tagging is consistent"""
    print("=" * 80)
    print(f"VERIFYING: {conll_file}")
    print("=" * 80)
    
    with open(conll_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Statistics
    total_tokens = 0
    total_sentences = 0
    label_counts = Counter()
    entity_examples = defaultdict(list)
    
    # Error tracking
    bio_errors = []
    suspicious_labels = []
    
    # Current sentence tracking
    current_sentence = []
    current_entity = None
    current_entity_tokens = []
    
    for line_num, line in enumerate(lines, 1):
        line = line.strip()
        
        if not line:
            # End of sentence
            if current_sentence:
                total_sentences += 1
                
                # Save last entity
                if current_entity and current_entity_tokens:
                    entity_text = ' '.join(current_entity_tokens)
                    entity_examples[current_entity].append(entity_text)
                
                current_sentence = []
                current_entity = None
                current_entity_tokens = []
            continue
        
        parts = line.split()
        if len(parts) != 2:
            print(f"⚠️  Line {line_num}: Invalid format - {line}")
            continue
        
        token, label = parts
        total_tokens += 1
        label_counts[label] += 1
        current_sentence.append((token, label))
        
        # Check BIO consistency
        if label.startswith('I-'):
            entity_type = label[2:]
            
            # I- tag must follow B- or I- of same type
            if current_entity != entity_type:
                bio_errors.append({
                    'line': line_num,
                    'token': token,
                    'label': label,
                    'error': f"I-{entity_type} without preceding B-{entity_type}",
                    'previous': current_entity
                })
            else:
                current_entity_tokens.append(token)
        
        elif label.startswith('B-'):
            # Save previous entity
            if current_entity and current_entity_tokens:
                entity_text = ' '.join(current_entity_tokens)
                entity_examples[current_entity].append(entity_text)
            
            # Start new entity
            entity_type = label[2:]
            current_entity = entity_type
            current_entity_tokens = [token]
        
        else:  # O or other
            # Save previous entity
            if current_entity and current_entity_tokens:
                entity_text = ' '.join(current_entity_tokens)
                entity_examples[current_entity].append(entity_text)
            
            current_entity = None
            current_entity_tokens = []
            
            # Check for suspicious O labels
            if label == 'O':
                # Check if token looks like it should be labeled
                if token.lower() in ['google', 'microsoft', 'amazon', 'infosys', 'tcs', 'wipro']:
                    suspicious_labels.append({
                        'line': line_num,
                        'token': token,
                        'label': label,
                        'suggestion': 'Should this be B-COMPANY?'
                    })
    
    # Print results
    print(f"\n📊 STATISTICS")
    print(f"   Total tokens: {total_tokens:,}")
    print(f"   Total sentences: {total_sentences:,}")
    print(f"   Unique labels: {len(label_counts)}")
    
    print(f"\n🏷️  LABEL DISTRIBUTION")
    for label, count in sorted(label_counts.items(), key=lambda x: -x[1]):
        percentage = (count / total_tokens) * 100
        print(f"   {label:20s}: {count:6,} ({percentage:5.2f}%)")
    
    # Check B- vs I- ratio for each entity type
    print(f"\n📈 B- vs I- TAG RATIO (for multi-word entity detection)")
    entity_types = set()
    for label in label_counts.keys():
        if label.startswith('B-'):
            entity_types.add(label[2:])
    
    for entity_type in sorted(entity_types):
        b_count = label_counts.get(f'B-{entity_type}', 0)
        i_count = label_counts.get(f'I-{entity_type}', 0)
        ratio = i_count / b_count if b_count > 0 else 0
        
        status = "✅" if ratio > 0.3 else "⚠️"
        print(f"   {status} {entity_type:20s}: B={b_count:5,} | I={i_count:5,} | Ratio={ratio:.2f}")
    
    # Show entity examples
    print(f"\n📝 ENTITY EXAMPLES (first 5 of each type)")
    for entity_type in sorted(entity_types):
        examples = entity_examples[entity_type][:5]
        print(f"\n   {entity_type}:")
        for ex in examples:
            print(f"      - {ex}")
    
    # Show errors
    if bio_errors:
        print(f"\n❌ BIO TAGGING ERRORS: {len(bio_errors)}")
        print("   First 10 errors:")
        for error in bio_errors[:10]:
            print(f"      Line {error['line']}: {error['token']} → {error['label']}")
            print(f"         Error: {error['error']}")
            print(f"         Previous entity: {error['previous']}")
    else:
        print(f"\n✅ NO BIO TAGGING ERRORS FOUND!")
    
    if suspicious_labels:
        print(f"\n⚠️  SUSPICIOUS LABELS: {len(suspicious_labels)}")
        print("   First 10 suspicious labels:")
        for susp in suspicious_labels[:10]:
            print(f"      Line {susp['line']}: '{susp['token']}' → {susp['label']}")
            print(f"         {susp['suggestion']}")
    else:
        print(f"\n✅ NO SUSPICIOUS LABELS FOUND!")
    
    # Final verdict
    print(f"\n{'='*80}")
    if not bio_errors and not suspicious_labels:
        print("✅ TRAINING DATA IS VALID AND READY FOR TRAINING!")
    elif bio_errors:
        print("❌ FIX BIO TAGGING ERRORS BEFORE TRAINING!")
    else:
        print("⚠️  REVIEW SUSPICIOUS LABELS (optional)")
    print(f"{'='*80}\n")
    
    return {
        'total_tokens': total_tokens,
        'total_sentences': total_sentences,
        'label_counts': label_counts,
        'bio_errors': len(bio_errors),
        'suspicious_labels': len(suspicious_labels),
        'valid': len(bio_errors) == 0
    }


def verify_label_mappings():
    """Verify label_mappings.json matches training data"""
    print("\n" + "=" * 80)
    print("VERIFYING LABEL MAPPINGS")
    print("=" * 80)
    
    # Check if label_mappings.json exists
    label_file = Path("data/label_mappings.json")
    if not label_file.exists():
        print("⚠️  label_mappings.json not found in data/ directory")
        return False
    
    with open(label_file, 'r') as f:
        label_data = json.load(f)
    
    labels = label_data.get('labels', [])
    print(f"\n📋 Labels in label_mappings.json: {len(labels)}")
    print(f"   {labels}")
    
    # Check for required labels
    required_labels = ['O']
    required_entity_types = [
        'PERSON_NAME', 'COMPANY', 'CLIENT', 'ROLE', 'LOCATION',
        'DATE_START', 'DATE_END', 'DEGREE', 'FIELD', 'INSTITUTION',
        'EDU_YEAR_START', 'EDU_YEAR_END', 'GRADE'
    ]
    
    missing_labels = []
    for entity_type in required_entity_types:
        if f'B-{entity_type}' not in labels:
            missing_labels.append(f'B-{entity_type}')
        if f'I-{entity_type}' not in labels:
            missing_labels.append(f'I-{entity_type}')
    
    if missing_labels:
        print(f"\n⚠️  Missing labels: {missing_labels}")
    else:
        print(f"\n✅ All required labels present!")
    
    return len(missing_labels) == 0


if __name__ == "__main__":
    print("\n🔍 TRAINING DATA VERIFICATION TOOL\n")
    
    # Verify training data
    train_file = "data/dataset_train.conll"
    if Path(train_file).exists():
        train_stats = verify_bio_tagging(train_file)
    else:
        print(f"❌ Training file not found: {train_file}")
        train_stats = None
    
    # Verify test data
    test_file = "data/dataset_test.conll"
    if Path(test_file).exists():
        print("\n")
        test_stats = verify_bio_tagging(test_file)
    else:
        print(f"⚠️  Test file not found: {test_file}")
        test_stats = None
    
    # Verify label mappings
    label_valid = verify_label_mappings()
    
    # Final summary
    print("\n" + "=" * 80)
    print("FINAL SUMMARY")
    print("=" * 80)
    
    if train_stats and train_stats['valid'] and label_valid:
        print("✅ ALL CHECKS PASSED - READY TO TRAIN!")
        print("\nNext steps:")
        print("1. Review the B- vs I- ratios above")
        print("2. If ratios look good, proceed with training")
        print("3. Use train_with_class_weights.py for best results")
    else:
        print("❌ PLEASE FIX ERRORS BEFORE TRAINING")
        if train_stats and not train_stats['valid']:
            print(f"   - Fix {train_stats['bio_errors']} BIO tagging errors")
        if not label_valid:
            print("   - Fix label_mappings.json")
    
    print("=" * 80)
