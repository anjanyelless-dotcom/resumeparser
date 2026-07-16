"""
DeBERTa Model Configuration
Configure the path to the DeBERTa NER model files.
"""

import os
from pathlib import Path

# Default model path (relative to ai-service directory)
DEFAULT_MODEL_PATH = str(Path(__file__).parent.parent / "models" / "resume-ner-deberta")

# Allow override via environment variable
DEBERTA_MODEL_PATH = os.getenv('DEBERTA_MODEL_PATH', DEFAULT_MODEL_PATH)

# Required model files
REQUIRED_MODEL_FILES = [
    'config.json',
    'tokenizer_config.json',
    'tokenizer.json'
]

# Model weights (at least one required)
REQUIRED_MODEL_WEIGHTS = [
    'pytorch_model.bin',
    'model.safetensors'
]
