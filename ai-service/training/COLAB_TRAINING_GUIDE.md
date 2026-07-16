# Google Colab Training Guide

## 🚀 Train Your Resume NER Model on Google Colab (FREE GPU)

Since your local Mac has memory constraints, use Google Colab's free GPU for faster training.

---

## 📋 Step-by-Step Instructions

### **Step 1: Prepare Files**

You need to upload 3 files to Google Colab:
1. `colab_train.py` - The training script (already created)
2. `train.json` - Training data (already created)
3. `test.json` - Test data (already created)

**File locations on your Mac:**
```
/Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser/ai-service/training/colab_train.py
/Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser/ai-service/training/data/train.json
/Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser/ai-service/training/data/test.json
```

---

### **Step 2: Open Google Colab**

1. Go to: https://colab.research.google.com/
2. Sign in with your Google account
3. Click **File → New Notebook**

---

### **Step 3: Upload Files to Colab**

In the Colab notebook, create a new code cell and run:

```python
# Upload files
from google.colab import files
uploaded = files.upload()
```

Then click the "Choose Files" button and upload:
- `colab_train.py`
- `train.json`
- `test.json`

---

### **Step 4: Enable GPU**

1. Click **Runtime → Change runtime type**
2. Select **GPU** from the "Hardware accelerator" dropdown
3. Click **Save**

---

### **Step 5: Install Dependencies**

Create a new code cell and run:

```python
!pip install transformers datasets evaluate torch scikit-learn accelerate -q
```

Wait for installation to complete (~2-3 minutes).

---

### **Step 6: Run Training**

Create a new code cell and run:

```python
!python colab_train.py
```

**Expected training time:** 15-30 minutes

You'll see progress bars and evaluation metrics during training.

---

### **Step 7: Download Trained Model**

After training completes, download the model:

```python
# Zip the model directory
!zip -r resume-ner-deberta.zip resume-ner-deberta/

# Download the zip file
from google.colab import files
files.download('resume-ner-deberta.zip')
```

---

### **Step 8: Use the Trained Model Locally**

1. Extract `resume-ner-deberta.zip` on your Mac
2. Move it to: `/Users/anjanyelle/Desktop/untitled folder 3/Lakshya-LLM-Resume-Parser/ai-service/models/`
3. Update `master_parser.py` to use the custom model

---

## 🎯 Complete Colab Notebook (Copy-Paste)

Here's a complete notebook you can copy-paste into Colab:

```python
# Cell 1: Upload files
from google.colab import files
print("📤 Upload train.json, test.json, and colab_train.py")
uploaded = files.upload()

# Cell 2: Install dependencies
!pip install transformers datasets evaluate torch scikit-learn accelerate -q
print("✅ Dependencies installed!")

# Cell 3: Check GPU
import torch
print(f"GPU Available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU Name: {torch.cuda.get_device_name(0)}")

# Cell 4: Run training
!python colab_train.py

# Cell 5: Download model
!zip -r resume-ner-deberta.zip resume-ner-deberta/
files.download('resume-ner-deberta.zip')
```

---

## 💡 Tips

- **Free GPU time:** Colab gives you ~12 hours of free GPU per session
- **Session timeout:** Sessions disconnect after 90 minutes of inactivity
- **Save progress:** Download the model immediately after training
- **Faster training:** GPU training is 10-20x faster than CPU

---

## 🔧 Troubleshooting

**Problem:** "Runtime disconnected"
- **Solution:** Reconnect and re-run cells from the beginning

**Problem:** "Out of memory"
- **Solution:** The script is already optimized for Colab's GPU

**Problem:** "Files not found"
- **Solution:** Make sure you uploaded all 3 files in Step 3

---

## 📊 Expected Results

After training, you should see metrics like:
```
precision: 0.85-0.95
recall: 0.80-0.90
f1: 0.82-0.92
```

The exact values depend on your dataset quality.

---

## ✅ Next Steps After Training

1. Download the trained model
2. Extract and move to `ai-service/models/resume-ner-deberta/`
3. Update `master_parser.py` to load the custom model
4. Test with real resumes
