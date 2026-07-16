# Resume Parser Training Data Export

This directory contains scripts and utilities for exporting labeled resume data as HuggingFace-compatible training data for NER (Named Entity Recognition) model training.

## 📁 Files Structure

```
ai-service/training/
├── export_training_data.py    # Main export script
├── setup.sh                   # Environment setup script
├── requirements.txt           # Python dependencies
├── data/                      # Output directory
│   ├── train.json            # Training data (80%)
│   └── test.json             # Test data (20%)
└── README.md                 # This file
```

## 🚀 Quick Start

### 1. Setup Environment

```bash
cd ai-service/training
chmod +x setup.sh
./setup.sh
```

### 2. Configure Database

Update the `.env` file with your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=resume_parser
DB_USER=postgres
DB_PASSWORD=your_password
```

### 3. Run Export Script

```bash
# Activate virtual environment
source venv/bin/activate

# Run the export
python export_training_data.py
```

## 📊 Output Format

The script generates two JSON files in HuggingFace-compatible format:

### train.json / test.json Format

```json
[
  {
    "tokens": ["John", "Doe", "Software", "Engineer", "at", "Google", "..."],
    "ner_tags": ["B-PER", "I-PER", "B-TITLE", "I-TITLE", "O", "B-ORG", "..."],
    "record_id": "uuid",
    "candidate_id": "uuid",
    "action": "corrected",
    "entity_stats": { "PER": 1, "TITLE": 1, "ORG": 1 }
  }
]
```

## 🏷️ Entity Types

| Entity Type | BIO Tag                    | Source Field      | Description       |
| ----------- | -------------------------- | ----------------- | ----------------- |
| PER         | B-PER, I-PER               | name              | Person names      |
| EMAIL       | B-EMAIL                    | email             | Email addresses   |
| PHONE       | B-PHONE                    | phone             | Phone numbers     |
| SKILL       | B-SKILL, I-SKILL           | skills            | Technical skills  |
| ORG         | B-ORG, I-ORG               | companies         | Company names     |
| TITLE       | B-TITLE, I-TITLE           | job_titles        | Job titles        |
| DEGREE      | B-DEGREE, I-DEGREE         | education_degrees | Education degrees |
| UNIVERSITY  | B-UNIVERSITY, I-UNIVERSITY | universities      | University names  |

## 📈 Export Summary

The script provides a comprehensive summary including:

- Total number of examples
- Train/test split statistics
- Entity type distribution
- Average tokens per example
- Sample data preview

Example output:

```
📊 TRAINING DATA EXPORT SUMMARY
============================================================
Total examples: 347
Train examples: 277 (80.0%)
Test examples: 70 (20.0%)

Entity distribution (TRAIN):
  DEGREE: 89
  EMAIL: 277
  ORG: 891
  PER: 277
  PHONE: 156
  SKILL: 2341
  TITLE: 445
  UNIVERSITY: 89

Average tokens per example:
  Train: 156.3
  Test: 142.7
```

## 🔧 Technical Details

### Data Processing Pipeline

1. **Database Connection**: Connects to PostgreSQL and fetches labeled data
2. **Tokenization**: Uses spaCy for accurate tokenization (falls back to basic splitting)
3. **Entity Detection**: Finds entity positions in raw text using string matching
4. **BIO Tagging**: Converts entity positions to BIO (Begin, Inside, Outside) format
5. **Data Splitting**: Splits data into 80% train / 20% test sets
6. **Export**: Saves as JSON files compatible with HuggingFace datasets

### Quality Assurance

- Only processes records with `action` = 'corrected' or 'approved'
- Skips records missing raw resume text or corrected fields
- Handles various data formats (JSON strings, arrays, objects)
- Provides detailed logging and error handling
- Uses reproducible random seed for consistent splits

### Database Query

The script fetches data using this SQL query:

```sql
SELECT
    ld.id,
    ld.candidate_id,
    ld.corrected_fields,
    ld.action,
    ld.labeled_at,
    c.raw_resume_text,
    -- ... other fields
FROM labeled_data ld
JOIN candidates c ON ld.candidate_id = c.id
WHERE ld.action IN ('corrected', 'approved')
AND c.raw_resume_text IS NOT NULL
AND ld.corrected_fields IS NOT NULL
ORDER BY ld.labeled_at DESC
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check your `.env` file configuration
   - Ensure PostgreSQL is running
   - Verify database credentials

2. **spaCy Model Not Found**
   - Run: `python -m spacy download en_core_web_sm`
   - Or use the setup script which handles this automatically

3. **No Labeled Data Found**
   - Ensure you have labeled data in the `labeled_data` table
   - Check that records have `action` = 'corrected' or 'approved'
   - Verify `raw_resume_text` and `corrected_fields` are not NULL

4. **Permission Errors**
   - Ensure the script has read access to the database
   - Check write permissions for the output directory

### Debug Mode

Add debug prints by modifying the script:

```python
# Add this line after imports
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📚 Usage in HuggingFace

The exported data can be loaded directly in HuggingFace:

```python
from datasets import load_dataset

# Load local JSON files
dataset = load_dataset('json', data_files={
    'train': 'ai-service/training/data/train.json',
    'test': 'ai-service/training/data/test.json'
})

# Use for NER training
from transformers import AutoTokenizer, AutoModelForTokenClassification

tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased')
model = AutoModelForTokenClassification.from_pretrained('bert-base-uncased', num_labels=8)  # 8 entity types
```

## 🔄 Continuous Training

For continuous model improvement:

1. **Regular Export**: Run the export script periodically as new data is labeled
2. **Version Control**: Keep track of different training data versions
3. **Quality Monitoring**: Monitor entity distribution and data quality
4. **Model Retraining**: Schedule regular model retraining with new data

## 📞 Support

If you encounter issues or have questions:

1. Check the troubleshooting section above
2. Review the script logs for detailed error messages
3. Ensure your database schema matches the expected format
4. Verify that labeled data exists and is properly formatted
