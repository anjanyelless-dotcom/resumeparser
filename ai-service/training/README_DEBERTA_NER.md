# DeBERTa-v3 Resume NER System

Complete guide for training and using the `microsoft/deberta-v3-base` model for resume Named Entity Recognition (NER).

## Overview

This system uses **microsoft/deberta-v3-base** fine-tuned for extracting structured information from resumes, specifically targeting work experience and education sections.

### Supported Entities

The model extracts the following entities:

| Entity | Description | Example |
|--------|-------------|---------|
| **PERSON** | Candidate name | "John Doe" |
| **COMPANY** | Company/employer name | "Acme Corporation" |
| **CLIENT** | Client name (for consulting roles) | "XYZ Inc." |
| **ROLE** | Job title/position | "Senior Software Engineer" |
| **LOCATION** | Geographic location | "San Francisco, CA" |
| **START_DATE** | Start date of employment/education | "Jan 2020" |
| **END_DATE** | End date of employment/education | "Dec 2022" |
| **EDUCATION** | Educational institution | "Stanford University" |
| **DEGREE** | Degree/qualification | "Master of Science" |

## System Architecture

The system is modular with three main components:

```
training/
├── model_loader.py      # Model loading and management
├── train.py             # Training pipeline
├── predict.py           # Inference pipeline
└── convert_doccano_to_training.py  # Data preparation
```

### 1. model_loader.py

Handles model initialization and label management.

**Key Features:**
- Loads `microsoft/deberta-v3-base` with custom labels
- Manages label2id and id2label mappings
- Supports both training and inference modes
- Auto-detects best device (CUDA/MPS/CPU)

**Usage:**
```python
from model_loader import load_for_training, load_for_inference

# For training
tokenizer, model, labels = load_for_training()

# For inference
tokenizer, model, device, labels = load_for_inference()
```

### 2. train.py

Training pipeline with HuggingFace Trainer API.

**Features:**
- Loads training data from JSON files
- Tokenizes and aligns labels (BIO format)
- Fine-tunes DeBERTa-v3-base
- Evaluates per-entity F1 scores
- Saves model to `./models/resume-ner-deberta`

**Usage:**
```bash
cd training
python train.py
```

**Training Configuration:**
- Epochs: 5
- Learning rate: 2e-5
- Batch size: 1 (with gradient accumulation of 8)
- Evaluation: Per epoch
- Output: `./models/resume-ner-deberta`

### 3. predict.py

Inference pipeline using HuggingFace pipeline with `aggregation_strategy="simple"`.

**Features:**
- Token classification with entity aggregation
- Returns structured JSON output
- Supports batch prediction
- Works on partial text (experience/education sections)

**Usage:**
```bash
# Predict from text
python predict.py --text "John Doe, Senior Engineer at Acme Corp"

# Predict from file
python predict.py --file resume.txt --output results.json

# Use custom model
python predict.py --file resume.txt --model /path/to/model
```

**Python API:**
```python
from predict import ResumeNERPredictor

predictor = ResumeNERPredictor()

# Extract all entities
entities = predictor.extract_entities(resume_text)

# Extract from experience section
experience = predictor.predict_experience_section(exp_text)

# Extract from education section
education = predictor.predict_education_section(edu_text)
```

**Output Format:**
```json
{
  "person": "John Doe",
  "company": ["Acme Corporation", "Tech Solutions"],
  "client": ["XYZ Inc.", "ABC Ltd."],
  "role": ["Senior Software Engineer"],
  "location": ["San Francisco, CA"],
  "start_date": ["Jan 2020"],
  "end_date": ["Present"],
  "education": ["Stanford University"],
  "degree": ["Master of Science"]
}
```

### 4. convert_doccano_to_training.py

Converts Doccano JSONL annotations to training format.

**Input Format (Doccano JSONL):**
```json
{
  "id": 1,
  "text": "John Doe worked at Acme Corp as Senior Engineer in NYC from Jan 2020 to Dec 2022",
  "labels": [
    {"start_offset": 0, "end_offset": 8, "label": "PERSON"},
    {"start_offset": 19, "end_offset": 28, "label": "COMPANY"},
    {"start_offset": 33, "end_offset": 48, "label": "ROLE"},
    {"start_offset": 52, "end_offset": 55, "label": "LOCATION"},
    {"start_offset": 61, "end_offset": 69, "label": "START_DATE"},
    {"start_offset": 73, "end_offset": 81, "label": "END_DATE"}
  ]
}
```

**Output Format (Training JSON):**
```json
{
  "id": 1,
  "tokens": ["John", "Doe", "worked", "at", "Acme", "Corp", ...],
  "ner_tags": ["B-PERSON", "I-PERSON", "O", "O", "B-COMPANY", "I-COMPANY", ...]
}
```

**Usage:**
```bash
python convert_doccano_to_training.py
```

**Label Mapping:**
The converter automatically maps various Doccano label formats to standardized entities:
- `PERSON_NAME`, `NAME`, `CANDIDATE_NAME` → `PERSON`
- `COMPANY_NAME`, `ORGANIZATION`, `ORG`, `EMPLOYER` → `COMPANY`
- `JOB_TITLE`, `TITLE`, `POSITION` → `ROLE`
- `UNIVERSITY`, `COLLEGE`, `SCHOOL` → `EDUCATION`
- And more...

## Setup and Installation

### 1. Install Dependencies

```bash
cd ai-service
pip install -r requirements.txt
```

**Key Dependencies:**
- `transformers==4.44.0` - HuggingFace transformers
- `torch==2.4.0` - PyTorch
- `datasets==2.14.0` - HuggingFace datasets
- `evaluate==0.4.0` - Evaluation metrics
- `scikit-learn==1.5.1` - Additional metrics

### 2. Prepare Training Data

**Option A: From Doccano**

1. Annotate resumes in Doccano using the supported entity labels
2. Export as JSONL format
3. Place in `training/data/dataset.jsonl`
4. Convert to training format:

```bash
cd training
python convert_doccano_to_training.py
```

This creates:
- `training/data/train.json` (80% of data)
- `training/data/test.json` (20% of data)

**Option B: Manual JSON Format**

Create `train.json` and `test.json` directly:

```json
[
  {
    "id": 1,
    "tokens": ["John", "Doe", "Senior", "Engineer", "at", "Acme"],
    "ner_tags": ["B-PERSON", "I-PERSON", "B-ROLE", "I-ROLE", "O", "B-COMPANY"]
  }
]
```

### 3. Train the Model

```bash
cd training
python train.py
```

**Training Output:**
- Checkpoints: `training/checkpoints/` (temporary)
- Final model: `../models/resume-ner-deberta/`
- Label mappings: `../models/resume-ner-deberta/label_mappings.json`

**Expected Training Time:**
- ~5-10 minutes per epoch (depends on dataset size and hardware)
- Total: ~25-50 minutes for 5 epochs

**Monitoring:**
- Training loss per 50 steps
- Evaluation metrics per epoch
- Per-entity F1 scores at the end

### 4. Run Inference

```bash
cd training
python predict.py --file sample_resume.txt
```

## Model Performance

### Target Accuracy

**Goal:** 90%+ accuracy for work experience and education extraction

**Metrics:**
- **Precision:** Percentage of predicted entities that are correct
- **Recall:** Percentage of actual entities that were found
- **F1 Score:** Harmonic mean of precision and recall

### Evaluation

Run evaluation on test set:

```bash
cd training
python evaluate.py
```

This will show:
- Overall F1, precision, recall
- Per-entity F1 scores
- Confusion matrix
- Example predictions

## Advanced Usage

### Custom Model Path

```python
from predict import ResumeNERPredictor

# Use custom model
predictor = ResumeNERPredictor(model_path="/path/to/custom/model")
entities = predictor.extract_entities(text)
```

### Batch Prediction

```python
from predict import ResumeNERPredictor

predictor = ResumeNERPredictor()
texts = [resume1, resume2, resume3]
results = predictor.predict_batch(texts)
```

### Fine-tuning on New Data

1. Add new annotated data to `dataset.jsonl`
2. Re-run conversion: `python convert_doccano_to_training.py`
3. Train from fine-tuned model:

```python
# In train.py, modify ModelLoader initialization:
loader = ModelLoader(model_path='../models/resume-ner-deberta')
```

### Offset Mapping for Span Alignment

The pipeline automatically handles offset mapping for accurate span extraction:

```python
predictor = ResumeNERPredictor()
predictions = predictor.predict(text)

for pred in predictions:
    print(f"Entity: {pred['word']}")
    print(f"Type: {pred['entity_group']}")
    print(f"Position: {pred['start']}-{pred['end']}")
    print(f"Score: {pred['score']}")
```

## Troubleshooting

### Out of Memory (OOM) Errors

Reduce batch size in `train.py`:
```python
per_device_train_batch_size=1
gradient_accumulation_steps=16  # Increase this
```

### Low Accuracy

1. **Check training data quality:**
   - Ensure consistent labeling
   - Verify entity boundaries are correct
   - Check for label mapping issues

2. **Increase training data:**
   - Aim for 100+ annotated examples per entity type
   - Balance entity distribution

3. **Adjust hyperparameters:**
   - Increase epochs (5 → 10)
   - Adjust learning rate (2e-5 → 3e-5)
   - Enable warmup steps

### Model Not Found

Ensure the model is trained and saved:
```bash
ls -la ../models/resume-ner-deberta/
```

Should contain:
- `config.json`
- `pytorch_model.bin` or `model.safetensors`
- `tokenizer_config.json`
- `vocab.txt`
- `label_mappings.json`

## Integration with Main Parser

To integrate with the main resume parser:

```python
# In main parser
from training.predict import ResumeNERPredictor

# Initialize once
ner_predictor = ResumeNERPredictor()

# Use in parsing pipeline
def parse_experience_section(text):
    entities = ner_predictor.predict_experience_section(text)
    return {
        'company': entities['company'],
        'role': entities['role'],
        'location': entities['location'],
        'start_date': entities['start_date'],
        'end_date': entities['end_date'],
        'clients': entities['client']
    }
```

## Files and Directories

```
training/
├── model_loader.py              # Model loading utilities
├── train.py                     # Training script
├── predict.py                   # Inference script
├── convert_doccano_to_training.py  # Data conversion
├── evaluate.py                  # Evaluation script
├── README_DEBERTA_NER.md       # This file
├── data/
│   ├── dataset.jsonl           # Doccano annotations (input)
│   ├── train.json              # Training data (generated)
│   └── test.json               # Test data (generated)
├── checkpoints/                # Training checkpoints (temporary)
└── ../models/
    └── resume-ner-deberta/     # Final trained model
        ├── config.json
        ├── pytorch_model.bin
        ├── tokenizer_config.json
        ├── vocab.txt
        └── label_mappings.json
```

## References

- **Model:** [microsoft/deberta-v3-base](https://huggingface.co/microsoft/deberta-v3-base)
- **Framework:** [HuggingFace Transformers](https://huggingface.co/docs/transformers)
- **Task:** [Token Classification](https://huggingface.co/docs/transformers/tasks/token_classification)
- **Annotation Tool:** [Doccano](https://github.com/doccano/doccano)

## License

This implementation uses the DeBERTa-v3 model which is licensed under MIT License.
