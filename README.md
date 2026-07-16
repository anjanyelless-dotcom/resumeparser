# DeBERTa NER Resume Training Project

This project contains the folder structure and resources for training a DeBERTa-based Named Entity Recognition (NER) model specifically for resume parsing.

## Project Structure

```
Lakshya-LLM-Resume-Parser/
├── data/
│   ├── raw/          # For JSON-MIN files (raw annotated resume data)
│   ├── converted/    # For CoNLL format output (processed training data)
│   └── splits/       # For train and test dataset splits
├── models/           # For saved trained model checkpoints and artifacts
├── scripts/          # For all Python training and preprocessing scripts
├── requirements.txt  # Required Python libraries
└── README.md         # This file
```

## Folder Descriptions

### `data/raw/`
- **Purpose**: Store raw JSON-MIN format resume annotation files
- **Contents**: Original annotated resume data in JSON-MIN format
- **Note**: This is the input data that will be processed and converted

### `data/converted/`
- **Purpose**: Store processed CoNLL format files ready for training
- **Contents**: Resume data converted to CoNLL format (token-label pairs)
- **Note**: This format is required for training the DeBERTa NER model

### `data/splits/`
- **Purpose**: Store train/validation/test dataset splits
- **Contents**: 
  - `train.txt` - Training dataset
  - `test.txt` - Test dataset
  - (optional) `dev.txt` or `val.txt` - Validation dataset
- **Note**: Files should be in CoNLL format

### `models/`
- **Purpose**: Store trained model checkpoints and artifacts
- **Contents**: 
  - Trained DeBERTa model files
  - Configuration files
  - Tokenizer files
  - Training logs and metrics
- **Note**: This directory will contain the final trained model

### `scripts/`
- **Purpose**: Contains all Python scripts for data processing and training
- **Potential scripts**:
  - `convert_json_to_conll.py` - Convert JSON-MIN to CoNLL format
  - `split_dataset.py` - Split data into train/test sets
  - `train_ner_model.py` - Main training script
  - `evaluate_model.py` - Model evaluation script
  - `inference.py` - Run inference on new resumes

## Installation

Install the required dependencies:

```bash
pip install -r requirements.txt
```

## Usage

1. Place your JSON-MIN annotated resume files in `data/raw/`
2. Run the conversion script to create CoNLL format files in `data/converted/`
3. Split the dataset using the split script to create files in `data/splits/`
4. Train the model using the training script
5. The trained model will be saved in `models/`

## Dependencies

- `transformers` - Hugging Face transformers library for DeBERTa model
- `datasets` - Dataset handling and processing
- `seqeval` - Evaluation metrics for sequence labeling
- `torch` - PyTorch deep learning framework
- `accelerate` - Distributed training and mixed precision
- `evaluate` - Evaluation metrics library   python training/data/colab_train.py
- `scikit-learn` - Machine learning utilities  


cd "/Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser/ai-service"
source venv/bin/activate
python main.py



cd "/Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser/backend/src"
npm install
npm run dev


cd "/Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser/frontend"
npm install
npm run dev


cd "/Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser/backend"
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 3001


cd /Users/anjanyelle/Desktop/untitled\ folder\ 3/Lakshya-LLM-Resume-Parser
source venv/bin/activate
python3 test_deberta_model.py --file resume1.txt 