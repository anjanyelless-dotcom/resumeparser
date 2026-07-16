#!/bin/bash

# Complete training pipeline script
# This script runs the full training pipeline: export data -> train model -> evaluate

echo "🚀 Starting Complete Resume NER Training Pipeline"
echo "Timestamp: $(date)"
echo "="*60

# Set script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run ./setup.sh first"
    exit 1
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Check if training data exists
if [ ! -f "data/train.json" ] || [ ! -f "data/test.json" ]; then
    echo "📊 Training data not found. Exporting from database..."
    python export_training_data.py
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to export training data"
        exit 1
    fi
fi

# Create necessary directories
mkdir -p training/checkpoints
mkdir -p ../models
mkdir -p evaluation_results

echo "📊 Training data found. Starting model training..."

# Run training
python train.py

if [ $? -ne 0 ]; then
    echo "❌ Training failed"
    exit 1
fi

echo "✅ Training completed successfully!"

# Check if model was saved
if [ ! -d "../models/resume-ner-deberta" ]; then
    echo "❌ Model not found after training"
    exit 1
fi

echo "📊 Starting model evaluation..."

# Run evaluation
python evaluate.py

if [ $? -ne 0 ]; then
    echo "❌ Evaluation failed"
    exit 1
fi

echo ""
echo "🎉 COMPLETE PIPELINE FINISHED SUCCESSFULLY!"
echo "="*60
echo "📁 Generated files:"
echo "   - Training data: data/train.json, data/test.json"
echo "   - Trained model: ../models/resume-ner-deberta/"
echo "   - Evaluation results: evaluation_results/"
echo "   - Training checkpoints: training/checkpoints/"
echo ""
echo "📊 Next steps:"
echo "   1. Review evaluation results in evaluation_results/evaluation_report.json"
echo "   2. Test the model with sample resumes"
echo "   3. Deploy model to production API"
echo "   4. Schedule periodic retraining with new labeled data"
echo ""
echo "🚀 Model is ready for production use!"
