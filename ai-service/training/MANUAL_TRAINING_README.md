# 🎯 Manual Label Training - Clean Mode

## Overview

This training pipeline uses **ONLY manually verified Label Studio annotations** and completely ignores all synthetic/auto-generated labels.

---

## 📂 Data Files Used

**ONLY these 3 files are loaded:**

1. `training/data/labelfiledata.json` (11,838 tasks)
2. `training/data/labelfiledata1.json` (10,998 tasks)
3. `training/data/labelfiledata2.json` (9,264 tasks)

**Total: 32,100 manually labeled tasks with 124,415 entities**

---

## 🚀 How to Train

### Step 1: Activate Virtual Environment

```bash
cd ai-service
source venv/bin/activate
```

### Step 2: Install Dependencies (if needed)

```bash
pip install transformers datasets torch scikit-learn
```

### Step 3: Run Training

```bash
python training/train_manual_labels_only.py
```

---

## 📊 What Happens During Training

1. **Load Manual Labels** ✅
   - Loads ONLY the 3 specified JSON files
   - Ignores all other files in `training/data/`
   - Validates Label Studio format

2. **Convert to NER Format** ✅
   - Converts Label Studio annotations to NER training format
   - Validates entity boundaries
   - Skips invalid entities

3. **Train/Val Split** ✅
   - 85% training (27,285 examples)
   - 15% validation (4,815 examples)
   - Shuffled with seed=42 for reproducibility

4. **Clear Old Artifacts** ✅
   - Removes old checkpoints
   - Clears cache
   - Starts completely fresh

5. **Train Model** ✅
   - Base model: `microsoft/deberta-v3-base`
   - 5 epochs
   - Batch size: 16
   - Learning rate: 2e-5
   - Saves best model based on F1 score

6. **Save Results** ✅
   - Model saved to `training/output_manual_only/`
   - Training logs in `training/output_manual_only/logs/`
   - Training info in `training_info.json`

---

## 📈 Expected Training Time

- **CPU**: ~6-8 hours
- **GPU (CUDA)**: ~1-2 hours
- **Apple Silicon (MPS)**: ~2-3 hours

---

## 🏷️ Entity Labels

The model is trained to recognize these entities:

### Work Experience:
- `COMPANY` - Company names
- `ROLE` - Job titles
- `LOCATION` - Work locations
- `DATE_START` - Start dates
- `DATE_END` - End dates
- `CLIENT` - Client names (for consulting)

### Education:
- `DEGREE` - Degree names (B.Tech, M.Sc, etc.)
- `INSTITUTION` - University/college names
- `FIELD` - Field of study
- `EDU_YEAR_START` - Education start year
- `EDU_YEAR_END` - Education end year
- `GRADE` - GPA/grades

---

## 📊 Entity Distribution

```
LOCATION            : 15,344 ( 12.3%)
DATE_START          : 11,950 (  9.6%)
ROLE                : 11,870 (  9.5%)
COMPANY             : 11,835 (  9.5%)
DATE_END            : 11,813 (  9.5%)
CLIENT              : 11,790 (  9.5%)
DEGREE              :  9,970 (  8.0%)
FIELD               :  9,935 (  8.0%)
INSTITUTION         :  9,929 (  8.0%)
EDU_YEAR_END        :  9,924 (  8.0%)
EDU_YEAR_START      :  9,918 (  8.0%)
GRADE               :    137 (  0.1%)
```

---

## ✅ Validation

After training, the model will be evaluated on the validation set:

- **F1 Score**: Weighted F1 across all entity types
- **Precision**: How many predicted entities are correct
- **Recall**: How many actual entities were found

**Target F1 Score**: > 85%

---

## 🔧 Troubleshooting

### Issue: Out of Memory

**Solution**: Reduce batch size in `train_manual_labels_only.py`:

```python
per_device_train_batch_size=8,  # Reduce from 16
per_device_eval_batch_size=8,
```

### Issue: Training Too Slow

**Solution**: Reduce number of epochs:

```python
num_train_epochs=3,  # Reduce from 5
```

### Issue: Low F1 Score

**Solution**: 
1. Check if labels are correct in Label Studio files
2. Increase training epochs
3. Try different learning rates (1e-5, 3e-5, 5e-5)

---

## 📁 Output Structure

```
training/output_manual_only/
├── config.json                 # Model configuration
├── pytorch_model.bin           # Trained model weights
├── tokenizer_config.json       # Tokenizer config
├── vocab.txt                   # Vocabulary
├── training_info.json          # Training metadata
├── logs/                       # TensorBoard logs
│   └── events.out.tfevents.*
└── checkpoint-*/               # Training checkpoints
    ├── config.json
    ├── pytorch_model.bin
    └── ...
```

---

## 🔄 Using the Trained Model

### Step 1: Copy Model to Production

```bash
# Backup old model
mv models/resume-ner-deberta models/resume-ner-deberta-backup

# Copy new model
cp -r training/output_manual_only models/resume-ner-deberta
```

### Step 2: Restart AI Service

```bash
pkill -f "python.*main.py"
python main.py
```

### Step 3: Test

```bash
curl -X POST http://localhost:8000/parse-sections \
  -H "Content-Type: application/json" \
  -d '{
    "experience_text": "Software Engineer at Google, Mountain View, CA (Jan 2020 - Present)"
  }'
```

---

## 📊 Compare with Old Model

### Old Model (Synthetic Labels):
- F1 Score: ~67%
- Many false positives (tech names as companies)
- Inconsistent entity extraction

### New Model (Manual Labels):
- Expected F1 Score: > 85%
- Clean entity extraction
- Better company/role separation
- More accurate date parsing

---

## 🎯 Next Steps

1. **Train the model** using this pipeline
2. **Evaluate F1 score** on validation set
3. **Test on real resumes** to verify quality
4. **Deploy to production** if F1 > 85%
5. **Monitor performance** and collect feedback
6. **Iterate** with more manual labels if needed

---

## ❓ FAQ

### Q: Can I add more manual label files?

**A**: Yes! Edit `manual_label_loader.py` and add filenames to `MANUAL_LABEL_FILES` list.

### Q: Will this delete my old model?

**A**: No. The new model is saved to `training/output_manual_only/`. Your old model in `models/` is untouched.

### Q: How do I monitor training progress?

**A**: Use TensorBoard:

```bash
tensorboard --logdir training/output_manual_only/logs
```

Then open http://localhost:6006

### Q: Can I resume training if it stops?

**A**: Yes, but you need to modify the script to use `resume_from_checkpoint`. For now, just restart training.

---

## ✅ Success Criteria

Training is successful if:

- ✅ All 3 manual label files loaded
- ✅ 32,100 tasks converted to NER format
- ✅ Model trains without errors
- ✅ Validation F1 score > 85%
- ✅ Test predictions look accurate
- ✅ No technology names extracted as companies

---

**Ready to train? Run:**

```bash
cd ai-service
source venv/bin/activate
python training/train_manual_labels_only.py
```

**Good luck! 🚀**
