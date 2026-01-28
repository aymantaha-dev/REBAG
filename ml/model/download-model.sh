#!/bin/bash

# Download the U2Net ONNX model for background removal

MODEL_DIR="."
MODEL_URL="https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx"
MODEL_PATH="$MODEL_DIR/u2net.onnx"

echo "Downloading U2Net ONNX model..."
mkdir -p "$MODEL_DIR"

if command -v curl &> /dev/null; then
    curl -L -o "$MODEL_PATH" "$MODEL_URL"
elif command -v wget &> /dev/null; then
    wget -O "$MODEL_PATH" "$MODEL_URL"
else
    echo "Error: Neither curl nor wget found. Please install one of them."
    exit 1
fi

if [ $? -eq 0 ]; then
    echo "Model downloaded successfully to $MODEL_PATH"
    echo "Size: $(du -h "$MODEL_PATH" | cut -f1)"
else
    echo "Failed to download model."
    exit 1
fi