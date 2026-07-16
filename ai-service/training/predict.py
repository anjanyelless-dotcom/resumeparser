#!/usr/bin/env python3
"""
Inference script for DeBERTa-v3 resume NER model.

This script:
1. Loads the fine-tuned DeBERTa-v3 model
2. Performs token classification on resume text
3. Returns structured JSON with extracted entities

Supports extraction of:
- PERSON (name)
- COMPANY (company names)
- CLIENT (client names)
- ROLE (job titles/roles)
- LOCATION (locations)
- START_DATE (start dates)
- END_DATE (end dates)
- EDUCATION (educational institutions)
- DEGREE (degree names)
"""

import os
import json
from typing import Dict, List, Optional, Any
from transformers import pipeline
import torch

# Import model loader
from model_loader import load_for_inference, LABELS


class ResumeNERPredictor:
    """Handles NER predictions on resume text"""
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the predictor.
        
        Args:
            model_path: Path to fine-tuned model. If None, uses default path.
        """
        self.model_path = model_path
        self.tokenizer = None
        self.model = None
        self.device = None
        self.pipeline = None
        self._load_model()
    
    def _load_model(self):
        """Load the model and create inference pipeline"""
        print("🚀 Loading NER model for inference...")
        
        # Load model using model_loader
        self.tokenizer, self.model, self.device, label_mappings = load_for_inference(self.model_path)
        
        # Create pipeline for token classification
        self.pipeline = pipeline(
            "token-classification",
            model=self.model,
            tokenizer=self.tokenizer,
            device=0 if self.device.type == 'cuda' else -1,
            aggregation_strategy="simple"  # Aggregates B- and I- tags
        )
        
        print(f"✅ Model loaded successfully")
        print(f"   Device: {self.device}")
        print(f"   Ready for inference")
    
    def predict(self, text: str) -> List[Dict[str, Any]]:
        """
        Perform NER prediction on text.
        
        Args:
            text: Resume text or experience section text
            
        Returns:
            List of entity dictionaries with keys: entity_group, word, start, end, score
        """
        if not text or not text.strip():
            return []
        
        # Run pipeline
        results = self.pipeline(text)
        
        return results
    
    def extract_entities(self, text: str) -> Dict[str, Any]:
        """
        Extract structured entities from resume text.
        
        Args:
            text: Resume text or experience section text
            
        Returns:
            Dictionary with extracted entities:
            {
                "person": str,
                "company": List[str],
                "client": List[str],
                "role": List[str],
                "location": List[str],
                "start_date": List[str],
                "end_date": List[str],
                "education": List[str],
                "degree": List[str]
            }
        """
        # Get predictions
        predictions = self.predict(text)
        
        # Initialize result structure
        result = {
            "person": None,
            "company": [],
            "client": [],
            "role": [],
            "location": [],
            "start_date": [],
            "end_date": [],
            "education": [],
            "degree": []
        }
        
        # Group predictions by entity type
        for pred in predictions:
            entity_type = pred['entity_group'].replace('B-', '').replace('I-', '')
            word = pred['word'].strip()
            score = pred['score']
            
            # Map entity types to result keys
            if entity_type == 'PERSON':
                # Take the first person name (usually the candidate)
                if result['person'] is None:
                    result['person'] = word
            elif entity_type == 'COMPANY':
                if word not in result['company']:
                    result['company'].append(word)
            elif entity_type == 'CLIENT':
                if word not in result['client']:
                    result['client'].append(word)
            elif entity_type == 'ROLE':
                if word not in result['role']:
                    result['role'].append(word)
            elif entity_type == 'LOCATION':
                if word not in result['location']:
                    result['location'].append(word)
            elif entity_type == 'START_DATE':
                if word not in result['start_date']:
                    result['start_date'].append(word)
            elif entity_type == 'END_DATE':
                if word not in result['end_date']:
                    result['end_date'].append(word)
            elif entity_type == 'EDUCATION':
                if word not in result['education']:
                    result['education'].append(word)
            elif entity_type == 'DEGREE':
                if word not in result['degree']:
                    result['degree'].append(word)
        
        return result
    
    def predict_experience_section(self, experience_text: str) -> Dict[str, Any]:
        """
        Extract entities from a single work experience section.
        
        Args:
            experience_text: Text of a single work experience entry
            
        Returns:
            Dictionary with extracted entities for that experience
        """
        entities = self.extract_entities(experience_text)
        
        # For experience sections, we typically expect:
        # - One company
        # - One or more clients
        # - One role
        # - One location
        # - One start_date and one end_date
        
        return {
            "company": entities['company'][0] if entities['company'] else None,
            "client": entities['client'],
            "role": entities['role'][0] if entities['role'] else None,
            "location": entities['location'][0] if entities['location'] else None,
            "start_date": entities['start_date'][0] if entities['start_date'] else None,
            "end_date": entities['end_date'][0] if entities['end_date'] else None
        }
    
    def predict_education_section(self, education_text: str) -> Dict[str, Any]:
        """
        Extract entities from a single education section.
        
        Args:
            education_text: Text of a single education entry
            
        Returns:
            Dictionary with extracted entities for that education
        """
        entities = self.extract_entities(education_text)
        
        return {
            "education": entities['education'][0] if entities['education'] else None,
            "degree": entities['degree'][0] if entities['degree'] else None,
            "location": entities['location'][0] if entities['location'] else None,
            "start_date": entities['start_date'][0] if entities['start_date'] else None,
            "end_date": entities['end_date'][0] if entities['end_date'] else None
        }
    
    def predict_batch(self, texts: List[str]) -> List[Dict[str, Any]]:
        """
        Perform batch prediction on multiple texts.
        
        Args:
            texts: List of resume texts or sections
            
        Returns:
            List of entity dictionaries
        """
        results = []
        for text in texts:
            results.append(self.extract_entities(text))
        return results


def predict_from_file(file_path: str, model_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Predict entities from a text file.
    
    Args:
        file_path: Path to text file containing resume text
        model_path: Optional path to model
        
    Returns:
        Dictionary with extracted entities
    """
    # Read file
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Create predictor
    predictor = ResumeNERPredictor(model_path)
    
    # Extract entities
    return predictor.extract_entities(text)


def main():
    """Main function for testing"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Resume NER Prediction')
    parser.add_argument('--text', type=str, help='Text to predict')
    parser.add_argument('--file', type=str, help='File containing text to predict')
    parser.add_argument('--model', type=str, help='Path to model directory')
    parser.add_argument('--output', type=str, help='Output JSON file path')
    
    args = parser.parse_args()
    
    # Create predictor
    predictor = ResumeNERPredictor(args.model)
    
    # Get text
    if args.file:
        with open(args.file, 'r', encoding='utf-8') as f:
            text = f.read()
    elif args.text:
        text = args.text
    else:
        # Example text
        text = """
        John Doe
        Senior Software Engineer at Acme Corp
        Working with client XYZ Inc.
        Location: San Francisco, CA
        Duration: Jan 2020 - Present
        
        Education:
        Master of Science in Computer Science
        Stanford University
        2015 - 2017
        """
    
    print("📝 Input text:")
    print("-" * 60)
    print(text)
    print("-" * 60)
    
    # Predict
    print("\n🔍 Extracting entities...")
    entities = predictor.extract_entities(text)
    
    # Print results
    print("\n📊 Extracted Entities:")
    print("=" * 60)
    print(json.dumps(entities, indent=2, ensure_ascii=False))
    print("=" * 60)
    
    # Save to file if specified
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(entities, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Results saved to: {args.output}")
    
    # Also show raw predictions
    print("\n🔬 Raw Predictions:")
    raw_predictions = predictor.predict(text)
    for pred in raw_predictions:
        print(f"  {pred['entity_group']:15} | {pred['word']:30} | Score: {pred['score']:.4f}")


if __name__ == "__main__":
    main()
