#!/bin/bash

# Ollama Setup Script for AI WhatsApp Agent
# This script installs Ollama and recommended models for offline AI capabilities

set -e  # Exit on error

echo "🚀 Ollama Setup for AI WhatsApp Agent"
echo "======================================"
echo ""

# Check if Ollama is already installed
if command -v ollama &> /dev/null; then
    echo "✅ Ollama is already installed"
    ollama --version
else
    echo "📦 Installing Ollama..."
    
    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://ollama.com/install.sh | sh
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "Please download and install Ollama from: https://ollama.com/download"
        echo "Or use: brew install ollama"
        exit 1
    else
        echo "❌ Unsupported OS: $OSTYPE"
        echo "Please install Ollama manually from: https://ollama.com/download"
        exit 1
    fi
fi

echo ""
echo "✅ Ollama installed successfully!"
echo ""

# Start Ollama service
echo "🔄 Starting Ollama service..."
ollama serve &
OLLAMA_PID=$!
sleep 3

echo ""
echo "📥 Downloading recommended AI models..."
echo ""

# Function to pull model with progress
pull_model() {
    local model=$1
    local description=$2
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Downloading: $model"
    echo "📝 Description: $description"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    ollama pull $model
    
    if [ $? -eq 0 ]; then
        echo "✅ $model downloaded successfully!"
    else
        echo "⚠️  Failed to download $model"
    fi
    echo ""
}

# Pull recommended models (choose based on your system resources)
echo "Choose models to download:"
echo ""
echo "1. llama3.2 (2GB) - Fast, good for general chat [RECOMMENDED]"
echo "2. mistral (4.1GB) - Better quality, still fast [RECOMMENDED]"
echo "3. phi3 (2.3GB) - Microsoft's efficient model"
echo "4. qwen2.5 (4.4GB) - Excellent multilingual support"
echo "5. All of the above"
echo ""

read -p "Enter your choice (1-5) [default: 5]: " choice
choice=${choice:-5}

case $choice in
    1)
        pull_model "llama3.2" "Fast, efficient model for everyday use"
        ;;
    2)
        pull_model "mistral" "High-quality, balanced model"
        ;;
    3)
        pull_model "phi3" "Microsoft's efficient model"
        ;;
    4)
        pull_model "qwen2.5" "Excellent for multilingual support"
        ;;
    5)
        pull_model "llama3.2" "Fast, efficient model for everyday use"
        pull_model "mistral" "High-quality, balanced model"
        pull_model "phi3" "Microsoft's efficient model"
        pull_model "qwen2.5" "Excellent for multilingual support"
        ;;
    *)
        echo "Invalid choice. Installing llama3.2 by default..."
        pull_model "llama3.2" "Fast, efficient model for everyday use"
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing Ollama installation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test Ollama with a simple query
echo "Testing with: 'Hello, this is a test message'"
ollama run llama3.2 "Hello, this is a test message. Reply in one sentence." --verbose

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Ollama is working correctly!"
else
    echo ""
    echo "⚠️  Ollama test failed. Please check the installation."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Installation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# List installed models
echo "Installed models:"
ollama list

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Ollama service is now running"
echo "2. Update your .env file:"
echo "   OLLAMA_BASE_URL=http://localhost:11434"
echo "   OLLAMA_PRIMARY_MODEL=mistral"
echo "   OLLAMA_FALLBACK_MODEL=llama3.2"
echo ""
echo "3. Start your WhatsApp agent:"
echo "   npm start"
echo ""
echo "4. To keep Ollama running in background:"
echo "   ollama serve > /dev/null 2>&1 &"
echo ""
echo "📚 Useful commands:"
echo "   ollama list                  # List installed models"
echo "   ollama pull <model>          # Download a new model"
echo "   ollama rm <model>            # Remove a model"
echo "   ollama run <model> 'prompt'  # Test a model"
echo ""
echo "🌐 Learn more: https://ollama.com/docs"
echo ""
