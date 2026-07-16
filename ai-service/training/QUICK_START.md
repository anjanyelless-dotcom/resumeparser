# Quick Start Guide - DeBERTa Resume NER

Get started with training and using the DeBERTa-v3 resume NER model in 5 minutes.

## Prerequisites

```bash
cd /Users/anjanyelle/Desktop/untitled\ folder\ 3/Lakshya-LLM-Resume-Parser/ai-service
pip install -r requirements.txt
```

## Step 1: Prepare Training Data (2 minutes)

### Option A: Use Doccano Annotations

1. Place your Doccano JSONL export in `training/data/dataset.jsonl`
2. Convert to training format:

```bash
cd training
python convert_doccano_to_training.py
```

### Option B: Create Manual Training Data

Create `training/data/train.json` and `training/data/test.json`:

```json
[
  {
    "id": 1,
    "tokens": ["John", "Doe", "worked", "at", "Acme", "Corp", "as", "Senior", "Engineer"],
    "ner_tags": ["B-PERSON", "I-PERSON", "O", "O", "B-COMPANY", "I-COMPANY", "O", "B-ROLE", "I-ROLE"]
  }
]
```

## Step 2: Train the Model (30-50 minutes)

```bash
cd training
python train.py
```

**What happens:**
- Downloads `microsoft/deberta-v3-base` (first time only)
- Trains for 5 epochs
- Saves model to `../models/resume-ner-deberta/`
- Shows per-entity F1 scores

**Expected output:**
```
🚀 Starting DeBERTa-v3 NER training pipeline
Model: microsoft/deberta-v3-base
Custom Labels: 19
...
📊 FINAL EVALUATION RESULTS
Test Precision: 0.8542
Test Recall: 0.8321
Test F1 Score: 0.8430
...
✅ Model saved to ../models/resume-ner-deberta
```

## Step 3: Run Inference (< 1 minute)

### Test with sample text:

```bash
cd training
python predict.py --text "John Doe, Senior Software Engineer at Acme Corporation, San Francisco, Jan 2020 - Present"
```

### Test with file:

```bash
python predict.py --file sample_resume.txt --output results.json
```

### Use in Python:

```python
from training.predict import ResumeNERPredictor

# Initialize predictor
predictor = ResumeNERPredictor()

# Extract entities
text = """
John Doe
Senior Software Engineer at Acme Corp
Client: XYZ Inc.
Location: San Francisco, CA
Duration: Jan 2020 - Dec 2022

Education:
Master of Science in Computer Science
Stanford University
2015 - 2017
"""

entities = predictor.extract_entities(text)
print(entities)
```

**Output:**
```json
{
  "person": "John Doe",
  "company": ["Acme Corp"],
  "client": ["XYZ Inc."],
  "role": ["Senior Software Engineer"],
  "location": ["San Francisco, CA"],
  "start_date": ["Jan 2020"],
  "end_date": ["Dec 2022"],
  "education": ["Stanford University"],
  "degree": ["Master of Science in Computer Science"]
}
```

## Step 4: Extract from Experience Section

```python
from training.predict import ResumeNERPredictor

predictor = ResumeNERPredictor()

experience_text = """
Senior Software Engineer
Acme Corporation
Client: XYZ Inc.
San Francisco, CA
Jan 2020 - Dec 2022
"""

result = predictor.predict_experience_section(experience_text)
print(result)
```

**Output:**
```json
{
  "company": "Acme Corporation",
  "client": ["XYZ Inc."],
  "role": "Senior Software Engineer",
  "location": "San Francisco, CA",
  "start_date": "Jan 2020",
  "end_date": "Dec 2022"
}
```

## Supported Entity Labels

| Label | Description | Example |
|-------|-------------|---------|
| PERSON | Candidate name | "John Doe" |
| COMPANY | Employer name | "Acme Corporation" |
| CLIENT | Client name | "XYZ Inc." |
| ROLE | Job title | "Senior Software Engineer" |
| LOCATION | Location | "San Francisco, CA" |
| START_DATE | Start date | "Jan 2020" |
| END_DATE | End date | "Dec 2022" |
| EDUCATION | Institution | "Stanford University" |
| DEGREE | Degree/qualification | "Master of Science" |

## Common Issues

### 1. Model not found
**Error:** `Model directory not found`
**Solution:** Train the model first with `python train.py`

### 2. Out of memory
**Error:** `CUDA out of memory`
**Solution:** Reduce batch size in `train.py`:
```python
per_device_train_batch_size=1
gradient_accumulation_steps=16
```

### 3. Low accuracy
**Solution:** 
- Add more training data (aim for 100+ examples)
- Check label consistency in annotations
- Increase training epochs (5 → 10)

## Next Steps

1. **Evaluate model:** `python evaluate.py`
2. **Read full docs:** See `README_DEBERTA_NER.md`
3. **Integrate with parser:** Import `ResumeNERPredictor` in your main parser

## File Structure

```
training/
├── model_loader.py              # ✅ Model loading
├── train.py                     # ✅ Training
├── predict.py                   # ✅ Inference
├── convert_doccano_to_training.py  # ✅ Data prep
├── QUICK_START.md              # 📖 This file
└── data/
    ├── dataset.jsonl           # Your Doccano export
    ├── train.json              # Generated training data
    └── test.json               # Generated test data
```

## Help

For detailed documentation, see:
- **Full Guide:** `README_DEBERTA_NER.md`
- **Model Info:** [microsoft/deberta-v3-base](https://huggingface.co/microsoft/deberta-v3-base)
- **HuggingFace Docs:** [Token Classification](https://huggingface.co/docs/transformers/tasks/token_classification)
