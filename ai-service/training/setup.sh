#!/bin/bash

# Setup script for training data export environment
# This script installs dependencies and sets up the environment

echo "🚀 Setting up training data export environment..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed. Please install Python 3 first."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

# Download spaCy model
echo "🧠 Downloading spaCy English model..."
python -m spacy download en_core_web_sm

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file with database configuration..."
    cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=resume_parser
DB_USER=postgres
DB_PASSWORD=password

# Update these values with your actual database configuration
EOF
    echo "⚠️  Please update the .env file with your actual database configuration"
fi

echo "✅ Setup completed!"
echo ""
echo "🎯 Next steps:"
echo "1. Update .env file with your database credentials"
echo "2. Run the export script: python export_training_data.py"
echo "3. Training data will be saved to the 'data/' directory"
echo ""
echo "📊 The script will create:"
echo "   - data/train.json (80% of labeled data)"
echo "   - data/test.json (20% of labeled data)"
echo "   - Both in HuggingFace-compatible format"
