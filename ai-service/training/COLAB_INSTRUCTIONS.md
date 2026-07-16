# 🚀 Google Colab Training Instructions

## 📦 Step 1: Prepare Training Package

Create a ZIP file with this exact structure:

```
Lakshya-Colab-Training/
├── ai-service/
│   ├── training/
│   │   ├── train.py
│   │   └── data/
│   │       ├── simple_dataset_train.conll
│   │       └── simple_dataset_test.conll
│   └── models/
│       └── (empty - model will be saved here)
```

### Create the ZIP on Mac:

```bash
cd "/Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser"

# Create the package structure
mkdir -p Lakshya-Colab-Training/ai-service/models
cp -r ai-service/training Lakshya-Colab-Training/ai-service/

# Create ZIP
zip -r Lakshya-Colab-Training.zip Lakshya-Colab-Training/

# Verify
ls -lh Lakshya-Colab-Training.zip
```

Expected ZIP size: ~50-100 MB (depending on your training data)

---

## 🌐 Step 2: Upload to Google Colab

1. **Open Colab**: Go to https://colab.research.google.com/

2. **Upload Notebook**:
   - Click **File → Upload notebook**
   - Upload: `ai-service/training/Colab_Training_Simple.ipynb`

3. **Enable GPU**:
   - Click **Runtime → Change runtime type**
   - Select **T4 GPU**
   - Click **Save**

4. **Run Training**:
   - Click the **Play button** on the single code cell
   - When prompted, upload `Lakshya-Colab-Training.zip`
   - Wait ~30-40 minutes for training to complete

---

## 📥 Step 3: Download Trained Model

The notebook will automatically:
1. Save model to your Google Drive: `/MyDrive/Resume-NER-Models/resume-ner-deberta`
2. Download a ZIP file: `resume-ner-deberta.zip`

### Install the Model Locally:

```bash
cd "/Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser/ai-service"

# Extract downloaded ZIP
unzip ~/Downloads/resume-ner-deberta.zip -d models/

# Verify
ls -lh models/resume-ner-deberta/
```

Expected files:
- `config.json`
- `pytorch_model.bin` (or `model.safetensors`)
- `tokenizer_config.json`
- `vocab.txt`
- `special_tokens_map.json`

---

## 🧪 Step 4: Test the Model

```bash
cd "/Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser/ai-service"
source venv/bin/activate
python main.py
```

Then test with:
```bash
curl -X POST 'http://localhost:8000/parse-sections' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "experience_text": "Software Engineer at Google from Jan 2020 to Dec 2022 in Mountain View",
    "education_text": "B.Tech in Computer Science from JNTU Hyderabad 2015-2019 Grade 8.2"
  }'
```

---

## 📊 Expected Training Results

With 19,292 training samples, you should see:

- **Precision**: 85-92%
- **Recall**: 83-90%
- **F1 Score**: 84-91%

### Entities Extracted:

**Work Experience:**
- COMPANY (e.g., "Infosys", "Google")
- CLIENT (e.g., "Google")
- ROLE (e.g., "Senior Data Engineer")
- LOCATION (e.g., "Hyderabad")
- DATE_START (e.g., "Jan 2021")
- DATE_END (e.g., "Mar 2023")

**Education:**
- DEGREE (e.g., "B.Tech")
- FIELD (e.g., "Computer Science")
- INSTITUTION (e.g., "JNTU Hyderabad")
- EDU_YEAR_START (e.g., "2015")
- EDU_YEAR_END (e.g., "2019")
- GRADE (e.g., "8.2")

---

## ⚠️ Troubleshooting

### Issue: "GPU not enabled"
**Solution**: Runtime → Change runtime type → T4 GPU → Save

### Issue: "ModuleNotFoundError"
**Solution**: The notebook installs all dependencies automatically. Just wait.

### Issue: "Out of memory"
**Solution**: 
- Reduce batch size in `train.py` (line ~200): `per_device_train_batch_size=4`
- Or use gradient accumulation

### Issue: "Training taking too long"
**Solution**: Normal! T4 GPU takes 30-40 minutes. Don't interrupt.

---

## 🎯 Quick Command Summary

```bash
# 1. Create training package
cd "/Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser"
mkdir -p Lakshya-Colab-Training/ai-service/models
cp -r ai-service/training Lakshya-Colab-Training/ai-service/
zip -r Lakshya-Colab-Training.zip Lakshya-Colab-Training/

# 2. After training, install model
cd ai-service
unzip ~/Downloads/resume-ner-deberta.zip -d models/

# 3. Test
source venv/bin/activate
python main.py
```

---

## ✅ Success Checklist

- [ ] ZIP file created (~50-100 MB)
- [ ] Colab notebook uploaded
- [ ] GPU enabled (T4)
- [ ] Training completed (~30-40 min)
- [ ] Model saved to Google Drive
- [ ] Model ZIP downloaded
- [ ] Model extracted to `ai-service/models/`
- [ ] AI service running on port 8000
- [ ] Test API call successful

---

**🎉 You're ready to train on Google Colab!**
