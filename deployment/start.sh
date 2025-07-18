#!/bin/bash

echo "Starting Weather Alert Monitor..."

# Check if SSL certificates exist
if [ -f /cert/fullchain.pem ] && [ -f /cert/privkey.pem ]; then
    echo "SSL certificates found. Starting with HTTPS on port 443..."
    exec gunicorn \
        --certfile=/cert/fullchain.pem \
        --keyfile=/cert/privkey.pem \
        --bind 0.0.0.0:443 \
        --workers 2 \
        --worker-class sync \
        --timeout 120 \
        --keep-alive 5 \
        --max-requests 500 \
        --max-requests-jitter 50 \
        --preload \
        --log-level info \
        --access-logfile - \
        --error-logfile - \
        --capture-output \
        server:app
else
    echo "SSL certificates not found. Starting with HTTP on port 80..."
    exec gunicorn \
        --bind 0.0.0.0:80 \
        --workers 2 \
        --worker-class sync \
        --timeout 120 \
        --keep-alive 5 \
        --max-requests 500 \
        --max-requests-jitter 50 \
        --preload \
        --log-level info \
        --access-logfile - \
        --error-logfile - \
        --capture-output \
        server:app
fi 