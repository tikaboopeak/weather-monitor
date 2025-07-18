#!/bin/bash

echo "Starting Weather Alert Monitor (HTTP only)..."

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