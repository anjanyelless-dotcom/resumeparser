#!/usr/bin/env python3
"""
Fix data issues: formatting artifacts, inconsistent labels, and data imbalance
"""

import re
from collections import Counter, defaultdict
from pathlib import Path

class DataFixer:
    def __init__(self, input_file, output_file):
        self.input_file = input_file
        self.output_file = output_file
        self.sentences = []
        self.fixes_applied = defaultdict(int)
        
    def load_data(self):
        """Load CoNLL format data"""
        print(f"\n📂 Loading: {self.input_file}")
        
        current_sentence = []
        with open(self.input_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    if current_sentence:
                        self.sentences.append(current_sentence)
                        current_sentence = []
                else:
                    parts = line.split()
                    if len(parts) == 2:
                        token, label = parts
                        current_sentence.append({'token': token, 'label': label})
        
        if current_sentence:
            self.sentences.append(current_sentence)
        
        print(f"   Loaded {len(self.sentences):,} sentences")
        print(f"   Total tokens: {sum(len(s) for s in self.sentences):,}")
    
    def fix_formatting_artifacts(self):
        """Remove formatting artifacts like 'r,', 'd', 't', 'h,'"""
        print("\n🔧 Fixing formatting artifacts...")
        
        # Common artifacts to remove
        artifacts = {
            'r,', 'd', 't', 'h,', 's,', 'n,', 'e,', 'l,', 'y,',
            'er,', 'or,', 'ar,', 'ir,'
        }
        
        cleaned_sentences = []
        
        for sentence in self.sentences:
            cleaned_sentence = []
            i = 0
            
            while i < len(sentence):
                token_data = sentence[i]
                token = token_data['token']
                label = token_data['label']
                
                # Check if this is a formatting artifact
                if token in artifacts and label == 'O':
                    # Skip this token
                    self.fixes_applied['artifacts_removed'] += 1
                    i += 1
                    continue
                
                # Check for single-character O tokens between entities (likely artifacts)
                if (len(token) == 1 and label == 'O' and 
                    token.lower() in 'dthrsnelyc' and
                    i > 0 and i < len(sentence) - 1):
                    
                    prev_label = sentence[i-1]['label']
                    next_label = sentence[i+1]['label']
                    
                    # If surrounded by entities, likely an artifact
                    if prev_label != 'O' and next_label != 'O':
                        self.fixes_applied['single_char_artifacts'] += 1
                        i += 1
                        continue
                
                cleaned_sentence.append(token_data)
                i += 1
            
            if cleaned_sentence:
                cleaned_sentences.append(cleaned_sentence)
        
        self.sentences = cleaned_sentences
        print(f"   ✅ Removed {self.fixes_applied['artifacts_removed'] + self.fixes_applied['single_char_artifacts']} artifacts")
    
    def fix_typo_labels(self):
        """Fix FEILD → FIELD typo"""
        print("\n🔧 Fixing label typos...")
        
        for sentence in self.sentences:
            for token_data in sentence:
                if token_data['label'] == 'B-FEILD':
                    token_data['label'] = 'B-FIELD'
                    self.fixes_applied['feild_to_field'] += 1
                elif token_data['label'] == 'I-FEILD':
                    token_data['label'] = 'I-FIELD'
                    self.fixes_applied['feild_to_field'] += 1
        
        if self.fixes_applied['feild_to_field'] > 0:
            print(f"   ✅ Fixed {self.fixes_applied['feild_to_field']} FEILD → FIELD")
        else:
            print(f"   ℹ️  No typos found")
    
    def normalize_date_labels(self):
        """Normalize date labels for consistency"""
        print("\n🔧 Normalizing date labels...")
        
        # This is actually contextually correct, so we'll just report
        # Users can choose to normalize if they want strict consistency
        
        date_patterns = defaultdict(set)
        
        for sentence in self.sentences:
            current_entity = []
            current_label = None
            
            for token_data in sentence:
                label = token_data['label']
                token = token_data['token']
                
                if label.startswith('B-'):
                    if current_entity and current_label:
                        text = ' '.join(current_entity)
                        if any(x in current_label for x in ['DATE', 'YEAR']):
                            date_patterns[text.lower()].add(current_label)
                    
                    current_label = label[2:]
                    current_entity = [token]
                
                elif label.startswith('I-') and current_label:
                    current_entity.append(token)
                
                else:
                    if current_entity and current_label:
                        text = ' '.join(current_entity)
                        if any(x in current_label for x in ['DATE', 'YEAR']):
                            date_patterns[text.lower()].add(current_label)
                    
                    current_entity = []
                    current_label = None
        
        inconsistent = {text: labels for text, labels in date_patterns.items() if len(labels) > 1}
        
        if inconsistent:
            print(f"   ℹ️  Found {len(inconsistent)} dates with multiple labels (contextually correct)")
            print(f"   ℹ️  No changes made - these are valid in different contexts")
        else:
            print(f"   ✅ All date labels are consistent")
    
    def remove_suspicious_entities(self):
        """Remove single-character entities that are likely errors"""
        print("\n🔧 Removing suspicious entities...")
        
        for sentence in self.sentences:
            for i, token_data in enumerate(sentence):
                token = token_data['token']
                label = token_data['label']
                
                # Single-character entities (except valid ones)
                if label.startswith('B-') and len(token) == 1:
                    entity_type = label[2:]
                    
                    # These entity types should not be single characters
                    if entity_type in ['COMPANY', 'INSTITUTION', 'LOCATION', 'ROLE', 'FIELD']:
                        # Except for valid single-char entities
                        if token not in ['I', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']:
                            # Change to O
                            token_data['label'] = 'O'
                            self.fixes_applied['suspicious_entities_fixed'] += 1
                            
                            # Also fix following I- tags
                            j = i + 1
                            while j < len(sentence) and sentence[j]['label'] == f'I-{entity_type}':
                                sentence[j]['label'] = 'O'
                                self.fixes_applied['suspicious_entities_fixed'] += 1
                                j += 1
        
        if self.fixes_applied['suspicious_entities_fixed'] > 0:
            print(f"   ✅ Fixed {self.fixes_applied['suspicious_entities_fixed']} suspicious entities")
        else:
            print(f"   ✅ No suspicious entities found")
    
    def save_data(self):
        """Save cleaned data"""
        print(f"\n💾 Saving to: {self.output_file}")
        
        with open(self.output_file, 'w', encoding='utf-8') as f:
            for sentence in self.sentences:
                for token_data in sentence:
                    f.write(f"{token_data['token']}\t{token_data['label']}\n")
                f.write('\n')
        
        print(f"   ✅ Saved {len(self.sentences):,} sentences")
        print(f"   ✅ Total tokens: {sum(len(s) for s in self.sentences):,}")
    
    def print_summary(self):
        """Print summary of fixes"""
        print("\n" + "="*80)
        print("FIXES APPLIED SUMMARY")
        print("="*80)
        
        total_fixes = sum(self.fixes_applied.values())
        
        print(f"\n📊 Total fixes: {total_fixes}")
        print(f"\n   Formatting artifacts removed: {self.fixes_applied['artifacts_removed'] + self.fixes_applied['single_char_artifacts']}")
        print(f"   FEILD → FIELD corrections: {self.fixes_applied['feild_to_field']}")
        print(f"   Suspicious entities fixed: {self.fixes_applied['suspicious_entities_fixed']}")
        
        print("\n✅ Data cleaning complete!")
        print("="*80)


def augment_rare_entities(input_file, output_file):
    """Add synthetic examples for rare entity types"""
    print("\n" + "="*80)
    print("AUGMENTING RARE ENTITIES")
    print("="*80)
    
    # Synthetic examples for FIELD (to balance with LOCATION)
    synthetic_examples = [
        # FIELD examples
        ("Master of Science in Artificial Intelligence , Stanford University , 2020 , 3.9/4.0", 
         ["O", "O", "O", "O", "B-FIELD", "I-FIELD", "O", "B-INSTITUTION", "I-INSTITUTION", "O", "B-EDU_YEAR_END", "O", "B-GRADE"]),
        
        ("Bachelor of Technology in Machine Learning , MIT , 2018 , 3.8/4.0",
         ["O", "O", "O", "O", "B-FIELD", "I-FIELD", "O", "B-INSTITUTION", "O", "B-EDU_YEAR_END", "O", "B-GRADE"]),
        
        ("PhD in Natural Language Processing , Carnegie Mellon University , 2022 , 4.0/4.0",
         ["O", "O", "B-FIELD", "I-FIELD", "I-FIELD", "O", "B-INSTITUTION", "I-INSTITUTION", "I-INSTITUTION", "O", "B-EDU_YEAR_END", "O", "B-GRADE"]),
        
        ("MBA in Business Analytics , Harvard Business School , 2021 , 3.7/4.0",
         ["O", "O", "B-FIELD", "I-FIELD", "O", "B-INSTITUTION", "I-INSTITUTION", "I-INSTITUTION", "O", "B-EDU_YEAR_END", "O", "B-GRADE"]),
        
        ("Master of Engineering in Computer Vision , Oxford University , 2019 , 3.9/4.0",
         ["O", "O", "O", "O", "B-FIELD", "I-FIELD", "O", "B-INSTITUTION", "I-INSTITUTION", "O", "B-EDU_YEAR_END", "O", "B-GRADE"]),
        
        ("Bachelor of Science in Data Science , UC Berkeley , 2020 , 3.8/4.0",
         ["O", "O", "O", "O", "B-FIELD", "I-FIELD", "O", "B-INSTITUTION", "I-INSTITUTION", "O", "B-EDU_YEAR_END", "O", "B-GRADE"]),
        
        ("Master of Technology in Deep Learning , IIT Delhi , 2021 , 9.2/10",
         ["O", "O", "O", "O", "B-FIELD", "I-FIELD", "O", "B-INSTITUTION", "I-INSTITUTION", "O", "B-EDU_YEAR_END", "O", "B-GRADE"]),
        
        ("PhD in Robotics Engineering , Georgia Tech , 2022 , 4.0/4.0",
         ["O", "O", "B-FIELD", "I-FIELD", "O", "B-INSTITUTION", "I-INSTITUTION", "O", "B-EDU_YEAR_END", "O", "B-GRADE"]),
        
        ("Bachelor of Arts in Computational Linguistics , Cambridge University , 2019 , First Class",
         ["O", "O", "O", "O", "B-FIELD", "I-FIELD", "O", "B-INSTITUTION", "I-INSTITUTION", "O", "B-EDU_YEAR_END", "O", "B-GRADE", "I-GRADE"]),
        
        ("Master of Science in Cybersecurity , ETH Zurich , 2020 , 5.8/6.0",
         ["O", "O", "O", "O", "B-FIELD", "O", "B-INSTITUTION", "I-INSTITUTION", "O", "B-EDU_YEAR_END", "O", "B-GRADE"]),
        
        ("Bachelor of Engineering in Cloud Computing , NIT Trichy , 2021 , 9.1/10",
         ["O", "O", "O", "O", "B-FIELD", "I-FIELD", "O", "B-INSTITUTION", "I-INSTITUTION", "O", "B-EDU_YEAR_END", "O", "B-GRADE"]),
        
        ("Master of Technology in Blockchain Technology , IIT Bombay , 2022 , 9.5/10",
         ["O", "O", "O", "O", "B-FIELD", "I-FIELD", "O", "B-INSTITUTION", "I-INSTITUTION", "O", "B-EDU_YEAR_END", "O", "B-GRADE"]),
        
        ("PhD in Quantum Computing , Caltech , 2023 , 4.0/4.0",
         ["O", "O", "B-FIELD", "I-FIELD", "O", "B-INSTITUTION", "O", "B-EDU_YEAR_END", "O", "B-GRADE"]),
        
        ("Bachelor of Science in DevOps Engineering , University of Toronto , 2020 , 3.9/4.0",
         ["O", "O", "O", "O", "B-FIELD", "I-FIELD", "O", "B-INSTITUTION", "I-INSTITUTION", "I-INSTITUTION", "O", "B-EDU_YEAR_END", "O", "B-GRADE"]),
        
        ("Master of Engineering in MLOps , Stanford University , 2021 , 3.8/4.0",
         ["O", "O", "O", "O", "B-FIELD", "O", "B-INSTITUTION", "I-INSTITUTION", "O", "B-EDU_YEAR_END", "O", "B-GRADE"]),
    ]
    
    print(f"\n📝 Adding {len(synthetic_examples)} synthetic examples for rare entity types...")
    
    # Load original data
    with open(input_file, 'r', encoding='utf-8') as f:
        original_data = f.read()
    
    # Create augmented data
    with open(output_file, 'w', encoding='utf-8') as f:
        # Write original data
        f.write(original_data)
        
        # Add synthetic examples
        for text, labels in synthetic_examples:
            tokens = text.split()
            for token, label in zip(tokens, labels):
                f.write(f"{token}\t{label}\n")
            f.write('\n')
    
    print(f"   ✅ Added {len(synthetic_examples)} examples")
    print(f"   ✅ Augmented data saved to: {output_file}")


def main():
    print("="*80)
    print("DATA CLEANING AND AUGMENTATION TOOL")
    print("="*80)
    
    # Fix training data
    print("\n" + "="*80)
    print("CLEANING TRAINING DATA")
    print("="*80)
    
    train_fixer = DataFixer(
        "data/dataset_train.conll",
        "data/dataset_train_cleaned.conll"
    )
    
    train_fixer.load_data()
    train_fixer.fix_formatting_artifacts()
    train_fixer.fix_typo_labels()
    train_fixer.remove_suspicious_entities()
    train_fixer.normalize_date_labels()
    train_fixer.save_data()
    train_fixer.print_summary()
    
    # Fix test data
    print("\n" + "="*80)
    print("CLEANING TEST DATA")
    print("="*80)
    
    test_fixer = DataFixer(
        "data/dataset_test.conll",
        "data/dataset_test_cleaned.conll"
    )
    
    test_fixer.load_data()
    test_fixer.fix_formatting_artifacts()
    test_fixer.fix_typo_labels()
    test_fixer.remove_suspicious_entities()
    test_fixer.normalize_date_labels()
    test_fixer.save_data()
    test_fixer.print_summary()
    
    # Augment rare entities
    augment_rare_entities(
        "data/dataset_train_cleaned.conll",
        "data/dataset_train_final.conll"
    )
    
    # Copy test data (no augmentation needed)
    print("\n📋 Copying cleaned test data...")
    Path("data/dataset_test_final.conll").write_text(
        Path("data/dataset_test_cleaned.conll").read_text()
    )
    print("   ✅ Test data ready")
    
    # Final summary
    print("\n" + "="*80)
    print("FINAL SUMMARY")
    print("="*80)
    
    print("\n✅ Data cleaning and augmentation complete!")
    print("\n📁 Output files:")
    print("   - data/dataset_train_final.conll (cleaned + augmented)")
    print("   - data/dataset_test_final.conll (cleaned)")
    
    print("\n📊 Changes made:")
    print("   ✅ Removed formatting artifacts (r,, d, t, etc.)")
    print("   ✅ Fixed FEILD → FIELD typo")
    print("   ✅ Removed suspicious single-character entities")
    print("   ✅ Added 15 synthetic examples for rare entity types")
    
    print("\n🚀 Next steps:")
    print("   1. Review the cleaned files")
    print("   2. Rename them to dataset_train.conll and dataset_test.conll")
    print("   3. Upload to Google Colab")
    print("   4. Start training!")
    
    print("\n" + "="*80)


if __name__ == "__main__":
    main()
