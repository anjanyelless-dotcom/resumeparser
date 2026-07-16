#!/bin/bash

echo "🚀 Setting up OpenAI Integration for Resume Parser"
echo ""

# Install OpenAI SDK
echo "📦 Installing OpenAI SDK..."
npm install openai

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
else
    echo "✅ .env file already exists"
fi

# Check if OPENAI_API_KEY is set
if grep -q "OPENAI_API_KEY=your_openai_api_key_here" .env; then
    echo ""
    echo "⚠️  WARNING: OPENAI_API_KEY is not configured!"
    echo ""
    echo "Please update your .env file with your OpenAI API key:"
    echo "  OPENAI_API_KEY=sk-..."
    echo ""
    echo "Get your API key from: https://platform.openai.com/api-keys"
    echo ""
elif grep -q "OPENAI_API_KEY=" .env; then
    echo "✅ OPENAI_API_KEY is configured"
else
    echo ""
    echo "⚠️  OPENAI_API_KEY not found in .env file"
    echo "Adding OPENAI_API_KEY to .env..."
    echo "" >> .env
    echo "# OpenAI API Configuration (required for gpt-4o-mini model)" >> .env
    echo "OPENAI_API_KEY=your_openai_api_key_here" >> .env
    echo ""
    echo "Please update your .env file with your OpenAI API key:"
    echo "  OPENAI_API_KEY=sk-..."
    echo ""
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Add your OpenAI API key to .env"
echo "  2. Restart your backend server: npm run dev"
echo "  3. Test with model='gpt-4o-mini' in the frontend"
echo ""
echo "📖 See OPENAI_INTEGRATION.md for full documentation"
