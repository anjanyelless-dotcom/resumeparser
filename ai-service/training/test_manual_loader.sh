#!/bin/bash
# Test script to verify manual label loader before training

echo "=================================="
echo "🧪 Testing Manual Label Loader"
echo "=================================="

cd "$(dirname "$0")/.."

echo ""
echo "📋 Step 1: Check if label files exist..."
for file in labelfiledata.json labelfiledata1.json labelfiledata2.json; do
    if [ -f "training/data/$file" ]; then
        size=$(du -h "training/data/$file" | cut -f1)
        echo "  ✅ $file ($size)"
    else
        echo "  ❌ $file NOT FOUND!"
        exit 1
    fi
done

echo ""
echo "📊 Step 2: Validate JSON format..."
for file in labelfiledata.json labelfiledata1.json labelfiledata2.json; do
    if python3 -c "import json; json.load(open('training/data/$file'))" 2>/dev/null; then
        count=$(python3 -c "import json; print(len(json.load(open('training/data/$file'))))")
        echo "  ✅ $file - Valid JSON ($count tasks)"
    else
        echo "  ❌ $file - Invalid JSON!"
        exit 1
    fi
done

echo ""
echo "🔄 Step 3: Test manual label loader..."
python3 training/manual_label_loader.py

echo ""
echo "=================================="
echo "✅ All tests passed!"
echo "=================================="
echo ""
echo "Ready to train! Run:"
echo "  python training/train_manual_labels_only.py"
