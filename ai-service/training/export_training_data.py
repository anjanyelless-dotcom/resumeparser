#!/usr/bin/env python3
"""
Export labeled resume data as HuggingFace-compatible training data for NER model training.

This script:
1. Connects to PostgreSQL database and loads labeled data
2. Converts labeled resumes to BIO token format
3. Splits data into train/test sets (80/20)
4. Exports as JSON files compatible with HuggingFace datasets
"""

import os
import json
import re
import random
from typing import List, Dict, Tuple, Any
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import spacy

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'resume_parser'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'password')
}

# Entity type mapping
ENTITY_MAPPING = {
    'name': 'PER',      # Person
    'email': 'EMAIL',   # Email
    'phone': 'PHONE',   # Phone
    'skills': 'SKILL',  # Skills
    'companies': 'ORG', # Organization/Company
    'job_titles': 'TITLE', # Job Title
    'education_degrees': 'DEGREE', # Education Degree
    'universities': 'UNIVERSITY' # University
}

class TrainingDataExporter:
    def __init__(self):
        self.conn = None
        self.nlp = None
        self.training_data = []
        
    def connect_to_database(self):
        """Connect to PostgreSQL database"""
        try:
            self.conn = psycopg2.connect(**DB_CONFIG)
            print("✅ Connected to database successfully")
        except Exception as e:
            print(f"❌ Failed to connect to database: {e}")
            raise
            
    def load_spacy_model(self):
        """Load spaCy model for tokenization"""
        try:
            self.nlp = spacy.load("en_core_web_sm")
            print("✅ Loaded spaCy model for tokenization")
        except OSError:
            print("⚠️  spaCy model not found, using basic tokenization")
            self.nlp = None
            
    def fetch_labeled_data(self) -> List[Dict]:
        """Fetch all labeled data from database"""
        query = """
        SELECT 
            ld.id,
            ld.candidate_id,
            ld.corrected_fields,
            ld.action,
            ld.labeled_at,
            c.raw_resume_text,
            c.full_name as original_name,
            c.email as original_email,
            c.phone as original_phone,
            c.skills as original_skills,
            c.companies as original_companies,
            c.job_titles as original_job_titles,
            c.education_degrees as original_education_degrees,
            c.universities as original_universities
        FROM labeled_data ld
        JOIN candidates c ON ld.candidate_id = c.id
        WHERE ld.action IN ('corrected', 'approved')
        AND c.raw_resume_text IS NOT NULL
        AND ld.corrected_fields IS NOT NULL
        ORDER BY ld.labeled_at DESC
        """
        
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query)
                results = cursor.fetchall()
                print(f"✅ Fetched {len(results)} labeled records")
                return results
        except Exception as e:
            print(f"❌ Failed to fetch labeled data: {e}")
            raise
            
    def tokenize_text(self, text: str) -> List[str]:
        """Tokenize text using spaCy or basic splitting"""
        if self.nlp:
            doc = self.nlp(text)
            return [token.text for token in doc]
        else:
            # Basic tokenization - split on whitespace and punctuation
            tokens = []
            for word in re.split(r'(\s+|[^\w\s])', text):
                if word.strip():
                    tokens.append(word.strip())
            return tokens
            
    def find_entity_positions(self, text: str, entity_values: List[str]) -> List[Tuple[int, int]]:
        """Find start and end positions of entities in text"""
        positions = []
        text_lower = text.lower()
        
        for value in entity_values:
            if not value or not isinstance(value, str):
                continue
                
            value_lower = value.lower()
            start = 0
            
            while True:
                pos = text_lower.find(value_lower, start)
                if pos == -1:
                    break
                    
                # Find word boundaries
                word_start = pos
                while word_start > 0 and not text[word_start - 1].isspace():
                    word_start -= 1
                    
                word_end = pos + len(value)
                while word_end < len(text) and not text[word_end].isspace():
                    word_end += 1
                    
                positions.append((word_start, word_end))
                start = pos + 1
                
        return positions
        
    def convert_to_bio_format(self, record: Dict) -> Dict[str, Any]:
        """Convert a single labeled record to BIO format"""
        raw_text = record['raw_resume_text']
        corrected_fields = record['corrected_fields']
        
        if not raw_text or not corrected_fields:
            return None
            
        # Parse corrected fields (they might be JSON strings)
        if isinstance(corrected_fields, str):
            try:
                corrected_fields = json.loads(corrected_fields)
            except json.JSONDecodeError:
                print(f"⚠️  Invalid JSON in corrected_fields for record {record['id']}")
                return None
                
        # Tokenize the text
        tokens = self.tokenize_text(raw_text)
        ner_tags = ['O'] * len(tokens)
        
        # Create token position map
        token_positions = []
        current_pos = 0
        
        if self.nlp:
            doc = self.nlp(raw_text)
            for token in doc:
                token_positions.append((token.idx, token.idx + len(token.text)))
        else:
            # Basic token position mapping
            for token in tokens:
                start = raw_text.find(token, current_pos)
                if start != -1:
                    end = start + len(token)
                    token_positions.append((start, end))
                    current_pos = end
                else:
                    token_positions.append((current_pos, current_pos + len(token)))
                    current_pos += len(token)
        
        # Process each entity type
        entity_stats = {}
        
        for field_name, entity_type in ENTITY_MAPPING.items():
            if field_name not in corrected_fields:
                continue
                
            values = corrected_fields[field_name]
            if not values:
                continue
                
            # Handle different value formats
            if isinstance(values, str):
                values = [values]
            elif isinstance(values, dict):
                values = list(values.values())
            elif not isinstance(values, list):
                continue
                
            # Find entity positions
            positions = self.find_entity_positions(raw_text, values)
            entity_stats[entity_type] = len(positions)
            
            # Mark tokens with BIO tags
            for start_pos, end_pos in positions:
                # Find which tokens overlap with this entity
                for i, (token_start, token_end) in enumerate(token_positions):
                    if token_start >= end_pos or token_end <= start_pos:
                        continue
                        
                    # Check if this is the beginning of an entity
                    if i == 0 or ner_tags[i-1] == 'O' or not ner_tags[i-1].endswith(entity_type):
                        ner_tags[i] = f'B-{entity_type}'
                    else:
                        ner_tags[i] = f'I-{entity_type}'
                        
        return {
            'tokens': tokens,
            'ner_tags': ner_tags,
            'record_id': record['id'],
            'candidate_id': record['candidate_id'],
            'action': record['action'],
            'entity_stats': entity_stats
        }
        
    def process_all_records(self, records: List[Dict]) -> List[Dict]:
        """Process all labeled records and convert to BIO format"""
        print("🔄 Converting labeled data to BIO format...")
        
        processed_data = []
        skipped_count = 0
        
        for i, record in enumerate(records):
            if i % 50 == 0:
                print(f"   Processing record {i+1}/{len(records)}...")
                
            bio_data = self.convert_to_bio_format(record)
            if bio_data:
                processed_data.append(bio_data)
            else:
                skipped_count += 1
                
        print(f"✅ Processed {len(processed_data)} records successfully")
        if skipped_count > 0:
            print(f"⚠️  Skipped {skipped_count} records due to missing data")
            
        return processed_data
        
    def split_data(self, data: List[Dict], train_ratio: float = 0.8) -> Tuple[List[Dict], List[Dict]]:
        """Split data into train and test sets"""
        random.seed(42)  # For reproducible splits
        random.shuffle(data)
        
        split_index = int(len(data) * train_ratio)
        train_data = data[:split_index]
        test_data = data[split_index:]
        
        return train_data, test_data
        
    def calculate_entity_distribution(self, data: List[Dict]) -> Dict[str, int]:
        """Calculate entity type distribution"""
        distribution = {}
        
        for record in data:
            if 'entity_stats' in record:
                for entity_type, count in record['entity_stats'].items():
                    distribution[entity_type] = distribution.get(entity_type, 0) + count
                    
        return distribution
        
    def save_data_files(self, train_data: List[Dict], test_data: List[Dict]):
        """Save training and test data to JSON files"""
        # Create output directory
        output_dir = '/Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser/ai-service/training/data'
        os.makedirs(output_dir, exist_ok=True)
        
        # Save training data
        train_file = os.path.join(output_dir, 'train.json')
        with open(train_file, 'w', encoding='utf-8') as f:
            json.dump(train_data, f, ensure_ascii=False, indent=2)
            
        # Save test data
        test_file = os.path.join(output_dir, 'test.json')
        with open(test_file, 'w', encoding='utf-8') as f:
            json.dump(test_data, f, ensure_ascii=False, indent=2)
            
        print(f"✅ Saved training data to: {train_file}")
        print(f"✅ Saved test data to: {test_file}")
        
    def print_summary(self, train_data: List[Dict], test_data: List[Dict]):
        """Print export summary"""
        total_examples = len(train_data) + len(test_data)
        train_dist = self.calculate_entity_distribution(train_data)
        test_dist = self.calculate_entity_distribution(test_data)
        
        print("\n" + "="*60)
        print("📊 TRAINING DATA EXPORT SUMMARY")
        print("="*60)
        print(f"Total examples: {total_examples}")
        print(f"Train examples: {len(train_data)} ({len(train_data)/total_examples*100:.1f}%)")
        print(f"Test examples: {len(test_data)} ({len(test_data)/total_examples*100:.1f}%)")
        
        print("\nEntity distribution (TRAIN):")
        for entity_type, count in sorted(train_dist.items()):
            print(f"  {entity_type}: {count}")
            
        print("\nEntity distribution (TEST):")
        for entity_type, count in sorted(test_dist.items()):
            print(f"  {entity_type}: {count}")
            
        # Calculate average tokens per example
        avg_tokens_train = sum(len(record['tokens']) for record in train_data) / len(train_data) if train_data else 0
        avg_tokens_test = sum(len(record['tokens']) for record in test_data) / len(test_data) if test_data else 0
        
        print(f"\nAverage tokens per example:")
        print(f"  Train: {avg_tokens_train:.1f}")
        print(f"  Test: {avg_tokens_test:.1f}")
        
        # Show sample data
        if train_data:
            print(f"\n📝 Sample training data:")
            sample = train_data[0]
            print(f"  Tokens: {sample['tokens'][:10]}...")
            print(f"  NER Tags: {sample['ner_tags'][:10]}...")
            
        print("="*60)
        
    def export_training_data(self):
        """Main export function"""
        print("🚀 Starting training data export...")
        print(f"Timestamp: {datetime.now().isoformat()}")
        
        try:
            # Connect to database
            self.connect_to_database()
            
            # Load spaCy model
            self.load_spacy_model()
            
            # Fetch labeled data
            records = self.fetch_labeled_data()
            
            if not records:
                print("⚠️  No labeled data found in database")
                return
                
            # Convert to BIO format
            self.training_data = self.process_all_records(records)
            
            if not self.training_data:
                print("⚠️  No valid training data generated")
                return
                
            # Split into train/test
            train_data, test_data = self.split_data(self.training_data)
            
            # Save data files
            self.save_data_files(train_data, test_data)
            
            # Print summary
            self.print_summary(train_data, test_data)
            
            print("\n🎉 Training data export completed successfully!")
            
        except Exception as e:
            print(f"❌ Export failed: {e}")
            raise
        finally:
            if self.conn:
                self.conn.close()
                print("🔒 Database connection closed")

def main():
    """Main function"""
    exporter = TrainingDataExporter()
    exporter.export_training_data()

if __name__ == "__main__":
    main()
