# 🚀 Google Colab Training Package

Train your Resume NER model on Google Colab's **FREE GPU** in 1-2 hours!

---

## 📦 What's Included

1. **`colab_train.py`** - Training script
2. **`Resume_NER_Training.ipynb`** - Jupyter notebook for Colab
3. **`README.md`** - This file

---

## 🎯 Quick Start

### Step 1: Upload to Google Colab

1. Go to https://colab.research.google.com
2. Click **File → Upload notebook**
3. Upload `Resume_NER_Training.ipynb`

### Step 2: Enable GPU

1. Click **Runtime → Change runtime type**
2. Select **GPU** (T4 recommended)
3. Click **Save**

### Step 3: Upload Data Files

1. Click the **folder icon** on the left sidebar
2. Click **Upload** button
3. Upload these 3 files:
   - `labelfiledata.json`
   - `labelfiledata1.json`
   - `labelfiledata2.json`

### Step 4: Upload Training Script

1. In the notebook, run the "Upload Training Script" cell
2. Select `colab_train.py` when prompted

### Step 5: Run Training

1. Click **Runtime → Run all**
2. Wait 1-2 hours for training to complete
3. Download the trained model ZIP file

---

## 📊 What to Expect

### Training Stats:
- **Total Tasks**: 32,100
- **Total Entities**: 124,415
- **Training Set**: 27,285 examples (85%)
- **Validation Set**: 4,815 examples (15%)

### Training Time:
- **GPU (T4)**: ~1-2 hours
- **GPU (A100)**: ~30-45 minutes
- **CPU**: ~8-10 hours (not recommended)

### Expected Results:
- **F1 Score**: > 85%
- **Model Size**: ~500 MB
- **Improvement**: +18% over synthetic labels (67% → 85%)

---

## 📥 After Training

### Step 1: Download Model

The notebook will automatically download `trained_model.zip`

### Step 2: Extract on Your Computer

```bash
unzip trained_model.zip
```

### Step 3: Copy to Your Project

```bash
# Backup old model
mv ai-service/models/resume-ner-deberta ai-service/models/resume-ner-deberta-backup

# Copy new model
cp -r trained_model ai-service/models/resume-ner-deberta
```

### Step 4: Restart AI Service

```bash
cd ai-service
source venv/bin/activate
python main.py
```

### Step 5: Test

```bash
curl -X POST http://localhost:8000/parse-sections \
  -H "Content-Type: application/json" \
  -d '{
    "experience_text": "Software Engineer at Google, Mountain View, CA (Jan 2020 - Present)"
  }'
```

---

## 🏷️ Entity Labels

The model recognizes these entities:

### Work Experience:
- `COMPANY` - Company names
- `ROLE` - Job titles
- `LOCATION` - Work locations
- `DATE_START` - Start dates
- `DATE_END` - End dates
- `CLIENT` - Client names

### Education:
- `DEGREE` - Degree names
- `INSTITUTION` - Universities
- `FIELD` - Field of study
- `EDU_YEAR_START` - Start year
- `EDU_YEAR_END` - End year
- `GRADE` - GPA/grades

---

## 🔧 Troubleshooting

### Issue: "No GPU available"

**Solution**: 
1. Runtime → Change runtime type → GPU
2. If GPU quota exceeded, try again later or upgrade to Colab Pro

### Issue: "Out of memory"

**Solution**: Reduce batch size in `colab_train.py`:
```python
per_device_train_batch_size=8,  # Reduce from 16
```

### Issue: "Files not found"

**Solution**: Make sure you uploaded all 3 JSON files to the root directory (not in a folder)

### Issue: "Training taking too long"

**Solution**: 
- Check if GPU is enabled (should show "Tesla T4" or similar)
- Reduce epochs in `colab_train.py`:
  ```python
  num_train_epochs=3,  # Reduce from 5
  ```

---

## 📊 Monitoring Training

### TensorBoard (Optional)

Add this cell to the notebook:

```python
%load_ext tensorboard
%tensorboard --logdir trained_model/logs
```

This shows:
- Training loss over time
- Validation F1 score
- Learning rate schedule

---

## 💰 Cost

### Google Colab Free:
- ✅ **FREE** GPU access
- ✅ 12-hour session limit
- ✅ Enough for this training (1-2 hours)

### Google Colab Pro ($10/month):
- ✅ Faster GPUs (A100, V100)
- ✅ 24-hour sessions
- ✅ More memory
- ✅ Priority access

**Recommendation**: Free tier is sufficient for this training!

---

## 🎯 Success Criteria

Training is successful if:

- ✅ All 3 files loaded (32,100 tasks)
- ✅ Training completes without errors
- ✅ Validation F1 score > 85%
- ✅ Model downloads successfully
- ✅ Test predictions look accurate

---

## 📞 Support

If you encounter issues:

1. Check the error message in Colab output
2. Verify all files are uploaded correctly
3. Make sure GPU is enabled
4. Try restarting the runtime (Runtime → Restart runtime)

---

## 🚀 Alternative: Use Training Script Directly

If you prefer command-line:

```bash
# Upload files to Colab
# Then run:
python colab_train.py
```

---

## ✅ Checklist

Before starting:
- [ ] Google account created
- [ ] Colab notebook uploaded
- [ ] GPU enabled
- [ ] 3 JSON files uploaded
- [ ] Training script uploaded
- [ ] Stable internet connection

During training:
- [ ] Monitor progress in output
- [ ] Check F1 score after each epoch
- [ ] Ensure no errors

After training:
- [ ] Download model ZIP
- [ ] Extract on local machine
- [ ] Copy to project
- [ ] Test with real resumes
- [ ] Compare with old model

---

## 🎉 Ready to Train!

1. Open `Resume_NER_Training.ipynb` in Google Colab
2. Follow the steps in the notebook
3. Wait for training to complete
4. Download and deploy your model!

**Good luck! 🚀**
