#!/bin/bash

echo "Starting Weather Alert Monitor..."

# Check if SSL certificates exist
if [ -f /cert/fullchain.pem ] && [ -f /cert/privkey.pem ]; then
    echo "SSL certificates found. Starting with HTTPS on port 443..."
    exec gunicorn \
        --certfile=/cert/fullchain.pem \
        --keyfile=/cert/privkey.pem \
        --bind 0.0.0.0:443 \
        --workers 4 \
        --worker-class sync \
        --timeout 30 \
        --keep-alive 2 \
        --max-requests 1000 \
        --max-requests-jitter 100 \
        --preload \
        server:app
else
    echo "SSL certificates not found. Starting with HTTP on port 80..."
    exec gunicorn \
        --bind 0.0.0.0:80 \
        --workers 4 \
        --worker-class sync \
        --timeout 30 \
        --keep-alive 2 \
        --max-requests 1000 \
        --max-requests-jitter 100 \
        --preload \
        server:app
fi 