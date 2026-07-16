#!/usr/bin/env python3
"""
Model loader for DeBERTa-v3-base NER model.

This module handles:
1. Loading the microsoft/deberta-v3-base model
2. Managing custom label mappings for resume NER
3. Providing model and tokenizer instances
"""

import os
import json
from typing import Dict, Optional
from transformers import AutoTokenizer, AutoModelForTokenClassification
import torch

# Custom labels for resume NER
# Note: PERSON removed - handled separately with regex pattern matching
LABELS = [
    'O',
    'B-COMPANY', 'I-COMPANY',
    'B-CLIENT', 'I-CLIENT',
    'B-ROLE', 'I-ROLE',
    'B-LOCATION', 'I-LOCATION',
    'B-START_DATE', 'I-START_DATE',
    'B-END_DATE', 'I-END_DATE',
    'B-EDUCATION', 'I-EDUCATION',
    'B-DEGREE', 'I-DEGREE'
]

# Create label mappings
LABEL_TO_ID = {label: i for i, label in enumerate(LABELS)}
ID_TO_LABEL = {i: label for i, label in enumerate(LABELS)}

# Model configuration
BASE_MODEL = 'microsoft/deberta-v3-base'
DEFAULT_MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models', 'resume-ner-deberta')


class ModelLoader:
    """Handles loading and managing the DeBERTa-v3 NER model"""
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the model loader.
        
        Args:
            model_path: Path to saved model. If None, uses base model.
        """
        self.model_path = model_path or BASE_MODEL
        self.tokenizer = None
        self.model = None
        self.device = self._get_device()
        
    def _get_device(self) -> torch.device:
        """Determine the best available device"""
        if torch.cuda.is_available():
            return torch.device('cuda')
        elif torch.backends.mps.is_available():
            return torch.device('mps')
        else:
            return torch.device('cpu')
    
    def load_tokenizer(self) -> AutoTokenizer:
        """
        Load the tokenizer.
        
        Returns:
            AutoTokenizer instance
        """
        if self.tokenizer is None:
            print(f"📖 Loading tokenizer from {self.model_path}...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
            print("✅ Tokenizer loaded successfully")
        return self.tokenizer
    
    def load_model(self, for_training: bool = False) -> AutoModelForTokenClassification:
        """
        Load the model for token classification.
        
        Args:
            for_training: If True, loads model in training mode
            
        Returns:
            AutoModelForTokenClassification instance
        """
        if self.model is None:
            print(f"🤖 Loading model from {self.model_path}...")
            
            # Check if this is a fine-tuned model or base model
            is_finetuned = os.path.exists(os.path.join(self.model_path, 'config.json'))
            
            if is_finetuned and self.model_path != BASE_MODEL:
                # Load fine-tuned model
                self.model = AutoModelForTokenClassification.from_pretrained(self.model_path)
                print(f"✅ Fine-tuned model loaded from {self.model_path}")
            else:
                # Load base model with custom labels
                self.model = AutoModelForTokenClassification.from_pretrained(
                    BASE_MODEL,
                    num_labels=len(LABELS),
                    id2label=ID_TO_LABEL,
                    label2id=LABEL_TO_ID,
                    ignore_mismatched_sizes=True
                )
                print(f"✅ Base model loaded: {BASE_MODEL}")
            
            # Move to device
            if not for_training:
                self.model.to(self.device)
                self.model.eval()
                print(f"   Device: {self.device}")
            
            print(f"   Labels: {len(LABELS)}")
        
        return self.model
    
    def load(self, for_training: bool = False):
        """
        Load both tokenizer and model.
        
        Args:
            for_training: If True, loads model in training mode
            
        Returns:
            Tuple of (tokenizer, model)
        """
        tokenizer = self.load_tokenizer()
        model = self.load_model(for_training=for_training)
        return tokenizer, model
    
    def save_model(self, output_dir: str, tokenizer: AutoTokenizer, model: AutoModelForTokenClassification):
        """
        Save the fine-tuned model and tokenizer.
        
        Args:
            output_dir: Directory to save the model
            tokenizer: Tokenizer to save
            model: Model to save
        """
        print(f"💾 Saving model to {output_dir}...")
        
        # Create directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Save model
        model.save_pretrained(output_dir, safe_serialization=True)
        
        # Save tokenizer
        tokenizer.save_pretrained(output_dir)
        
        # Save label mappings
        label_config = {
            'labels': LABELS,
            'label2id': LABEL_TO_ID,
            'id2label': {str(k): v for k, v in ID_TO_LABEL.items()}
        }
        
        with open(os.path.join(output_dir, 'label_mappings.json'), 'w') as f:
            json.dump(label_config, f, indent=2)
        
        print(f"✅ Model saved successfully to {output_dir}")
        print(f"   - Model weights: pytorch_model.bin / model.safetensors")
        print(f"   - Tokenizer: tokenizer_config.json, vocab.txt, etc.")
        print(f"   - Labels: label_mappings.json")


def get_label_mappings() -> Dict:
    """
    Get the label mappings.
    
    Returns:
        Dictionary with labels, label2id, and id2label mappings
    """
    return {
        'labels': LABELS,
        'label2id': LABEL_TO_ID,
        'id2label': ID_TO_LABEL
    }


def load_for_training() -> tuple:
    """
    Convenience function to load model for training.
    
    Returns:
        Tuple of (tokenizer, model, label_mappings)
    """
    loader = ModelLoader()
    tokenizer, model = loader.load(for_training=True)
    return tokenizer, model, get_label_mappings()


def load_for_inference(model_path: Optional[str] = None) -> tuple:
    """
    Convenience function to load model for inference.
    
    Args:
        model_path: Path to saved model. If None, uses default path.
        
    Returns:
        Tuple of (tokenizer, model, device, label_mappings)
    """
    if model_path is None:
        model_path = DEFAULT_MODEL_DIR
        
    # Check if fine-tuned model exists, otherwise use base model
    if not os.path.exists(model_path):
        print(f"⚠️  Fine-tuned model not found at {model_path}")
        print(f"   Using base model: {BASE_MODEL}")
        model_path = BASE_MODEL
    
    loader = ModelLoader(model_path)
    tokenizer, model = loader.load(for_training=False)
    
    return tokenizer, model, loader.device, get_label_mappings()


if __name__ == "__main__":
    """Test the model loader"""
    print("Testing ModelLoader...")
    print("=" * 60)
    
    # Test loading for training
    print("\n1. Loading for training:")
    tokenizer, model, labels = load_for_training()
    print(f"   Tokenizer vocab size: {len(tokenizer)}")
    print(f"   Model num labels: {model.config.num_labels}")
    print(f"   Available labels: {len(labels['labels'])}")
    
    # Test loading for inference
    print("\n2. Loading for inference:")
    tokenizer, model, device, labels = load_for_inference()
    print(f"   Device: {device}")
    print(f"   Model ready for inference")
    
    print("\n✅ All tests passed!")
