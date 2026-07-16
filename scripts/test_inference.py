#!/usr/bin/env python3
"""
Test inference script for trained Resume NER model.
Loads model and performs NER extraction with grouped output.
"""

import torch
from transformers import AutoTokenizer, AutoModelForTokenClassification
import json
from pathlib import Path
from collections import defaultdict


class ResumeNERPredictor:
    def __init__(self, model_path: str):
        """Load the trained model and tokenizer."""
        self.model_path = model_path
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForTokenClassification.from_pretrained(model_path)
        
        # Load label mappings
        with open(f"{model_path}/label_mappings.json", 'r') as f:
            mappings = json.load(f)
        
        self.id_to_label = {int(k): v for k, v in mappings['id_to_label'].items()}
        self.label_list = mappings['labels']
        
        # Define entity groups
        self.entity_groups = {
            'COMPANY': ['B-COMPANY', 'I-COMPANY'],
            'CLIENT': ['B-CLIENT', 'I-CLIENT'],
            'ROLE': ['B-ROLE', 'I-ROLE'],
            'LOCATION': ['B-LOCATION', 'I-LOCATION'],
            'DATE_START': ['B-DATE_START', 'I-DATE_START'],
            'DATE_END': ['B-DATE_END', 'I-DATE_END'],
            'DEGREE': ['B-DEGREE', 'I-DEGREE'],
            'FIELD': ['B-FIELD', 'I-FIELD'],
            'INSTITUTION': ['B-INSTITUTION', 'I-INSTITUTION'],
            'EDU_YEAR_START': ['B-EDU_YEAR_START', 'I-EDU_YEAR_START'],
            'EDU_YEAR_END': ['B-EDU_YEAR_END', 'I-EDU_YEAR_END'],
            'GRADE': ['B-GRADE', 'I-GRADE']
        }
    
    def predict(self, text: str):
        """Perform NER prediction on input text."""
        # Tokenize input
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        )
        
        # Get predictions
        with torch.no_grad():
            outputs = self.model(**inputs)
        
        # Get predicted labels
        predictions = torch.argmax(outputs.logits, dim=2)
        
        # Convert tokens to labels
        tokens = self.tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
        predicted_labels = [self.id_to_label[int(label_id)] for label_id in predictions[0]]
        
        # Group tokens by entity
        entities = self._group_entities(tokens, predicted_labels)
        
        return entities
    
    def _group_entities(self, tokens, labels):
        """Group consecutive tokens into entities."""
        entities = defaultdict(list)
        current_entity = None
        current_tokens = []
        
        for token, label in zip(tokens, labels):
            # Skip special tokens
            if token in ['[CLS]', '[SEP]', '[PAD]']:
                continue
            
            # Remove subword prefixes
            if token.startswith('##'):
                token = token[2:]
            
            # Handle entity boundaries
            if label.startswith('B-'):
                # Save previous entity if exists
                if current_entity and current_tokens:
                    entity_text = ' '.join(current_tokens).strip()
                    entities[current_entity].append(entity_text)
                
                # Start new entity
                current_entity = label[2:]  # Remove 'B-' prefix
                current_tokens = [token]
            
            elif label.startswith('I-'):
                # Continue current entity
                if current_entity == label[2:]:
                    current_tokens.append(token)
                else:
                    # This shouldn't happen in proper BIO tagging
                    if current_entity and current_tokens:
                        entity_text = ' '.join(current_tokens).strip()
                        entities[current_entity].append(entity_text)
                    current_entity = label[2:]
                    current_tokens = [token]
            
            else:  # 'O' label
                # Save previous entity if exists
                if current_entity and current_tokens:
                    entity_text = ' '.join(current_tokens).strip()
                    entities[current_entity].append(entity_text)
                
                current_entity = None
                current_tokens = []
        
        # Save last entity if exists
        if current_entity and current_tokens:
            entity_text = ' '.join(current_tokens).strip()
            entities[current_entity].append(entity_text)
        
        return entities
    
    def format_output(self, entities):
        """Format entities for clean display."""
        output_lines = []
        
        # Define display order
        display_order = [
            'COMPANY', 'CLIENT', 'ROLE', 'LOCATION', 
            'DATE_START', 'DATE_END', 'DEGREE', 'FIELD',
            'INSTITUTION', 'EDU_YEAR_START', 'EDU_YEAR_END', 'GRADE'
        ]
        
        for entity_type in display_order:
            if entity_type in entities and entities[entity_type]:
                # Remove duplicates and join with comma
                unique_entities = list(dict.fromkeys(entities[entity_type]))  # Preserve order, remove duplicates
                entities_str = ', '.join(unique_entities)
                output_lines.append(f"{entity_type:<15} → {entities_str}")
        
        return '\n'.join(output_lines)


def main():
    """Main inference function."""
    model_path = "models/resume-ner-final"
    
    # Check if model exists
    if not Path(model_path).exists():
        print(f"❌ Model not found at {model_path}")
        print("Please train the model first using: python scripts/train.py")
        return
    
    print("🤖 LOADING NER MODEL")
    print("=" * 50)
    
    # Initialize predictor
    try:
        predictor = ResumeNERPredictor(model_path)
        print("✅ Model loaded successfully!")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return
    
    # Test with sample text
    sample_text = """Senior Java Developer at Infosys, Hyderabad 
from Jan 2021 to Mar 2023. Client: Google.
B.Tech Computer Science, JNTU Hyderabad, 2016-2020"""
    
    print(f"\n📄 SAMPLE INPUT:")
    print("-" * 50)
    print(sample_text)
    
    print(f"\n🔍 RUNNING NER EXTRACTION...")
    print("-" * 50)
    
    # Perform prediction
    try:
        entities = predictor.predict(sample_text)
        
        # Format and display results
        formatted_output = predictor.format_output(entities)
        
        print("📊 EXTRACTED ENTITIES:")
        print("=" * 50)
        print(formatted_output)
        
        # Show raw entities for debugging
        print(f"\n🔬 RAW ENTITY DETAILS:")
        print("-" * 50)
        for entity_type, entity_list in entities.items():
            if entity_list:
                print(f"{entity_type}: {entity_list}")
        
    except Exception as e:
        print(f"❌ Error during prediction: {e}")
        return
    
    print(f"\n✅ Inference completed successfully!")


if __name__ == "__main__":
    main()
