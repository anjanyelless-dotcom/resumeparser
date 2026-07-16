#!/usr/bin/env python3
"""
Deep validation of training data quality
Checks labeling consistency, synthetic data quality, and format correctness
"""

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

class DataValidator:
    def __init__(self, conll_file):
        self.conll_file = conll_file
        self.sentences = []
        self.issues = defaultdict(list)
        self.stats = defaultdict(int)
        
    def load_data(self):
        """Load CoNLL format data"""
        print(f"\n📂 Loading: {self.conll_file}")
        
        current_sentence = []
        with open(self.conll_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    if current_sentence:
                        self.sentences.append(current_sentence)
                        current_sentence = []
                else:
                    parts = line.split()
                    if len(parts) == 2:
                        token, label = parts
                        current_sentence.append({
                            'token': token,
                            'label': label,
                            'line_num': line_num
                        })
                    else:
                        self.issues['format_errors'].append({
                            'line': line_num,
                            'content': line,
                            'error': f'Invalid format (expected 2 columns, got {len(parts)})'
                        })
        
        if current_sentence:
            self.sentences.append(current_sentence)
        
        print(f"   Loaded {len(self.sentences):,} sentences")
        return len(self.sentences) > 0
    
    def check_bio_consistency(self):
        """Check BIO tagging consistency"""
        print("\n🔍 Checking BIO consistency...")
        
        for sent_idx, sentence in enumerate(self.sentences):
            current_entity = None
            
            for token_idx, token_data in enumerate(sentence):
                label = token_data['label']
                
                # I- tag must follow B- or I- of same type
                if label.startswith('I-'):
                    entity_type = label[2:]
                    
                    if current_entity != entity_type:
                        self.issues['bio_errors'].append({
                            'sentence': sent_idx,
                            'token': token_data['token'],
                            'label': label,
                            'line': token_data['line_num'],
                            'error': f"I-{entity_type} without preceding B-{entity_type}",
                            'context': ' '.join([t['token'] for t in sentence[max(0, token_idx-3):token_idx+4]])
                        })
                        self.stats['bio_errors'] += 1
                
                # Update current entity
                if label.startswith('B-'):
                    current_entity = label[2:]
                elif label.startswith('I-') and current_entity:
                    pass  # Continue current entity
                else:
                    current_entity = None
        
        if self.stats['bio_errors'] == 0:
            print("   ✅ No BIO tagging errors found")
        else:
            print(f"   ❌ Found {self.stats['bio_errors']} BIO tagging errors")
    
    def check_label_consistency(self):
        """Check for inconsistent labeling of same entities"""
        print("\n🔍 Checking label consistency...")
        
        # Track how each entity text is labeled
        entity_labels = defaultdict(set)
        
        for sentence in self.sentences:
            current_entity_text = []
            current_entity_label = None
            
            for token_data in sentence:
                label = token_data['label']
                token = token_data['token']
                
                if label.startswith('B-'):
                    # Save previous entity
                    if current_entity_text and current_entity_label:
                        text = ' '.join(current_entity_text)
                        entity_labels[text.lower()].add(current_entity_label)
                    
                    # Start new entity
                    current_entity_label = label[2:]
                    current_entity_text = [token]
                
                elif label.startswith('I-') and current_entity_label:
                    current_entity_text.append(token)
                
                else:
                    # Save previous entity
                    if current_entity_text and current_entity_label:
                        text = ' '.join(current_entity_text)
                        entity_labels[text.lower()].add(current_entity_label)
                    
                    current_entity_text = []
                    current_entity_label = None
            
            # Save last entity
            if current_entity_text and current_entity_label:
                text = ' '.join(current_entity_text)
                entity_labels[text.lower()].add(current_entity_label)
        
        # Find inconsistencies
        inconsistent = {text: labels for text, labels in entity_labels.items() if len(labels) > 1}
        
        if inconsistent:
            print(f"   ⚠️  Found {len(inconsistent)} entities with inconsistent labels:")
            for text, labels in sorted(inconsistent.items())[:20]:
                self.issues['inconsistent_labels'].append({
                    'text': text,
                    'labels': list(labels)
                })
                print(f"      '{text}' → {labels}")
                self.stats['inconsistent_entities'] += 1
        else:
            print("   ✅ No inconsistent labeling found")
    
    def check_synthetic_quality(self):
        """Detect and analyze synthetic/generated data quality"""
        print("\n🔍 Analyzing synthetic data quality...")
        
        # Patterns that might indicate synthetic data
        synthetic_patterns = {
            'repeated_structures': [],
            'unrealistic_combinations': [],
            'formatting_issues': []
        }
        
        # Check for repeated sentence structures
        sentence_structures = Counter()
        for sentence in self.sentences:
            structure = ' '.join([t['label'] for t in sentence])
            sentence_structures[structure] += 1
        
        # Find overly repeated structures (might be synthetic)
        for structure, count in sentence_structures.most_common(20):
            if count > 10:  # Same structure repeated >10 times
                synthetic_patterns['repeated_structures'].append({
                    'structure': structure[:100],
                    'count': count
                })
        
        # Check for unrealistic entity combinations
        for sent_idx, sentence in enumerate(self.sentences):
            tokens = [t['token'] for t in sentence]
            labels = [t['label'] for t in sentence]
            
            # Check for single-character entities (except valid ones like 'I', 'A')
            for i, (token, label) in enumerate(zip(tokens, labels)):
                if label.startswith('B-') and len(token) == 1 and token not in ['I', 'A', 'B', 'C', 'D']:
                    if label[2:] in ['COMPANY', 'INSTITUTION', 'LOCATION']:
                        synthetic_patterns['unrealistic_combinations'].append({
                            'sentence': sent_idx,
                            'token': token,
                            'label': label,
                            'context': ' '.join(tokens[max(0, i-3):i+4])
                        })
            
            # Check for formatting artifacts
            for i, token in enumerate(tokens):
                if token in ['r,', 'd', 't', 'h,']:  # Artifacts like in your data
                    synthetic_patterns['formatting_issues'].append({
                        'sentence': sent_idx,
                        'token': token,
                        'context': ' '.join(tokens[max(0, i-3):i+4])
                    })
        
        # Report findings
        if synthetic_patterns['repeated_structures']:
            print(f"   ⚠️  Found {len(synthetic_patterns['repeated_structures'])} overly repeated structures")
            for pattern in synthetic_patterns['repeated_structures'][:5]:
                print(f"      Structure repeated {pattern['count']} times")
        
        if synthetic_patterns['unrealistic_combinations']:
            print(f"   ⚠️  Found {len(synthetic_patterns['unrealistic_combinations'])} unrealistic entity combinations")
            for issue in synthetic_patterns['unrealistic_combinations'][:5]:
                print(f"      '{issue['token']}' labeled as {issue['label']}")
        
        if synthetic_patterns['formatting_issues']:
            print(f"   ⚠️  Found {len(synthetic_patterns['formatting_issues'])} formatting artifacts")
            for issue in synthetic_patterns['formatting_issues'][:5]:
                print(f"      Token: '{issue['token']}' in context: {issue['context']}")
        
        self.issues['synthetic_quality'] = synthetic_patterns
        
        if not any(synthetic_patterns.values()):
            print("   ✅ No obvious synthetic data quality issues")
    
    def check_entity_quality(self):
        """Check quality of extracted entities"""
        print("\n🔍 Checking entity quality...")
        
        entity_examples = defaultdict(list)
        suspicious_entities = []
        
        for sentence in self.sentences:
            current_entity_text = []
            current_entity_label = None
            
            for token_data in sentence:
                label = token_data['label']
                token = token_data['token']
                
                if label.startswith('B-'):
                    # Save previous
                    if current_entity_text and current_entity_label:
                        text = ' '.join(current_entity_text)
                        entity_examples[current_entity_label].append(text)
                    
                    # Start new
                    current_entity_label = label[2:]
                    current_entity_text = [token]
                
                elif label.startswith('I-') and current_entity_label:
                    current_entity_text.append(token)
                
                else:
                    # Save previous
                    if current_entity_text and current_entity_label:
                        text = ' '.join(current_entity_text)
                        entity_examples[current_entity_label].append(text)
                    
                    current_entity_text = []
                    current_entity_label = None
            
            # Save last
            if current_entity_text and current_entity_label:
                text = ' '.join(current_entity_text)
                entity_examples[current_entity_label].append(text)
        
        # Check for suspicious entities
        for entity_type, examples in entity_examples.items():
            for example in examples:
                # Check for single-char companies/institutions
                if entity_type in ['COMPANY', 'INSTITUTION', 'LOCATION'] and len(example) == 1:
                    if example not in ['I', 'A']:
                        suspicious_entities.append({
                            'type': entity_type,
                            'text': example,
                            'issue': 'Single character entity'
                        })
                
                # Check for numeric-only entities (except dates/grades)
                if entity_type not in ['DATE_START', 'DATE_END', 'EDU_YEAR_START', 'EDU_YEAR_END', 'GRADE']:
                    if example.replace(',', '').replace('.', '').isdigit():
                        suspicious_entities.append({
                            'type': entity_type,
                            'text': example,
                            'issue': 'Numeric-only entity'
                        })
                
                # Check for punctuation-only entities
                if all(c in '.,;:!?-–—' for c in example):
                    suspicious_entities.append({
                        'type': entity_type,
                        'text': example,
                        'issue': 'Punctuation-only entity'
                    })
        
        if suspicious_entities:
            print(f"   ⚠️  Found {len(suspicious_entities)} suspicious entities:")
            for entity in suspicious_entities[:20]:
                print(f"      {entity['type']:15s}: '{entity['text']}' ({entity['issue']})")
                self.stats['suspicious_entities'] += 1
        else:
            print("   ✅ No suspicious entities found")
        
        self.issues['suspicious_entities'] = suspicious_entities
    
    def check_data_balance(self):
        """Check if data is balanced across entity types"""
        print("\n🔍 Checking data balance...")
        
        label_counts = Counter()
        entity_type_counts = Counter()
        
        for sentence in self.sentences:
            for token_data in sentence:
                label = token_data['label']
                label_counts[label] += 1
                
                if label.startswith('B-'):
                    entity_type_counts[label[2:]] += 1
        
        # Check for severely imbalanced entity types
        if entity_type_counts:
            max_count = max(entity_type_counts.values())
            min_count = min(entity_type_counts.values())
            
            print(f"   Entity type distribution:")
            for entity_type, count in sorted(entity_type_counts.items(), key=lambda x: -x[1])[:15]:
                percentage = (count / sum(entity_type_counts.values())) * 100
                print(f"      {entity_type:20s}: {count:5,} ({percentage:5.2f}%)")
            
            if max_count / min_count > 100:
                print(f"   ⚠️  Severe imbalance: {max_count/min_count:.1f}x difference between most and least common")
                self.stats['severe_imbalance'] = True
            else:
                print(f"   ✅ Reasonable balance (max/min ratio: {max_count/min_count:.1f}x)")
    
    def generate_report(self):
        """Generate final validation report"""
        print("\n" + "="*80)
        print("VALIDATION REPORT")
        print("="*80)
        
        total_issues = sum([
            len(self.issues.get('bio_errors', [])),
            len(self.issues.get('inconsistent_labels', [])),
            len(self.issues.get('suspicious_entities', [])),
            len(self.issues.get('format_errors', []))
        ])
        
        print(f"\n📊 Summary:")
        print(f"   Total sentences: {len(self.sentences):,}")
        print(f"   Total tokens: {sum(len(s) for s in self.sentences):,}")
        print(f"   Total issues found: {total_issues}")
        
        print(f"\n🔍 Issue Breakdown:")
        print(f"   BIO errors: {len(self.issues.get('bio_errors', []))}")
        print(f"   Inconsistent labels: {len(self.issues.get('inconsistent_labels', []))}")
        print(f"   Suspicious entities: {len(self.issues.get('suspicious_entities', []))}")
        print(f"   Format errors: {len(self.issues.get('format_errors', []))}")
        
        # Synthetic data quality
        synthetic = self.issues.get('synthetic_quality', {})
        if synthetic:
            print(f"\n🤖 Synthetic Data Quality:")
            print(f"   Repeated structures: {len(synthetic.get('repeated_structures', []))}")
            print(f"   Unrealistic combinations: {len(synthetic.get('unrealistic_combinations', []))}")
            print(f"   Formatting artifacts: {len(synthetic.get('formatting_issues', []))}")
        
        # Final verdict
        print(f"\n{'='*80}")
        
        critical_issues = len(self.issues.get('bio_errors', [])) + len(self.issues.get('format_errors', []))
        
        if critical_issues == 0:
            print("✅ DATA IS VALID - READY FOR TRAINING!")
            print("\nRecommendations:")
            if len(self.issues.get('suspicious_entities', [])) > 0:
                print("   - Review suspicious entities (optional)")
            if len(self.issues.get('inconsistent_labels', [])) > 0:
                print("   - Consider fixing inconsistent labels for better accuracy")
            if synthetic.get('formatting_issues'):
                print("   - Clean up formatting artifacts (recommended)")
            print("\n✅ You can proceed with training on Google Colab!")
        else:
            print("❌ CRITICAL ISSUES FOUND - FIX BEFORE TRAINING!")
            print("\nRequired fixes:")
            if len(self.issues.get('bio_errors', [])) > 0:
                print(f"   - Fix {len(self.issues.get('bio_errors', []))} BIO tagging errors")
            if len(self.issues.get('format_errors', [])) > 0:
                print(f"   - Fix {len(self.issues.get('format_errors', []))} format errors")
        
        print("="*80)
        
        return critical_issues == 0


def main():
    print("="*80)
    print("DEEP DATA VALIDATION")
    print("="*80)
    
    # Validate training data
    train_file = "data/dataset_train.conll"
    if Path(train_file).exists():
        print(f"\n📋 Validating training data...")
        validator = DataValidator(train_file)
        
        if validator.load_data():
            validator.check_bio_consistency()
            validator.check_label_consistency()
            validator.check_entity_quality()
            validator.check_synthetic_quality()
            validator.check_data_balance()
            train_valid = validator.generate_report()
        else:
            print(f"❌ Failed to load {train_file}")
            train_valid = False
    else:
        print(f"❌ Training file not found: {train_file}")
        train_valid = False
    
    # Validate test data
    test_file = "data/dataset_test.conll"
    if Path(test_file).exists():
        print(f"\n\n📋 Validating test data...")
        validator = DataValidator(test_file)
        
        if validator.load_data():
            validator.check_bio_consistency()
            validator.check_label_consistency()
            validator.check_entity_quality()
            validator.check_synthetic_quality()
            validator.check_data_balance()
            test_valid = validator.generate_report()
        else:
            print(f"❌ Failed to load {test_file}")
            test_valid = False
    else:
        print(f"⚠️  Test file not found: {test_file}")
        test_valid = True  # Optional
    
    # Final summary
    print("\n" + "="*80)
    print("FINAL VALIDATION SUMMARY")
    print("="*80)
    
    if train_valid and test_valid:
        print("\n✅ ALL DATA VALIDATED - READY FOR GOOGLE COLAB TRAINING!")
        print("\nNext steps:")
        print("1. Go to https://colab.research.google.com/")
        print("2. Upload TRAIN_ON_COLAB.ipynb")
        print("3. Enable GPU (Runtime → Change runtime type → GPU)")
        print("4. Upload data/dataset_train.conll and data/dataset_test.conll")
        print("5. Run all cells")
        print("\n⏱️  Expected training time: 30-40 minutes")
    else:
        print("\n❌ PLEASE FIX ISSUES BEFORE TRAINING")
    
    print("="*80)


if __name__ == "__main__":
    main()
