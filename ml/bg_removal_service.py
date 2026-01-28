#!/usr/bin/env python3
"""
REBAG ML Microservice
Background removal using U2Net via rembg library.
"""

import os
import io
from flask import Flask, request, send_file, jsonify
from rembg import remove
from PIL import Image

# Configuration
PORT = int(os.environ.get('ML_SERVICE_PORT', 5050))
MODEL_DIR = os.environ.get('MODEL_DIR', './model')
os.makedirs(MODEL_DIR, exist_ok=True)

# Set environment variable for rembg to use local model
os.environ['U2NET_HOME'] = MODEL_DIR

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'rebag-ml-service',
        'model': 'u2net',
        'model_path': MODEL_DIR
    })

@app.route('/remove-bg', methods=['POST'])
def remove_background():
    """Remove background from uploaded image"""
    try:
        # Check if image file is in request
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided. Use "image" field in multipart form.'
            }), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Read image from request
        input_image = Image.open(file.stream)
        
        # Remove background using rembg
        output_image = remove(input_image)
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        output_image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        return send_file(
            img_byte_arr,
            mimetype='image/png',
            as_attachment=False,
            download_name='removed_bg.png'
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print(f"REBAG ML Microservice starting on port {PORT}")
    print(f"Model directory: {MODEL_DIR}")
    print(f"Health endpoint: http://localhost:{PORT}/health")
    print(f"Remove BG endpoint: POST http://localhost:{PORT}/remove-bg")
    app.run(host='0.0.0.0', port=PORT, debug=False)