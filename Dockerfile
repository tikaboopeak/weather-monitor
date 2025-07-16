# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy all application files
COPY server.py .
COPY requirements.txt .
COPY index.html .
COPY script.js .
COPY styles.css .
COPY database.json .
COPY Images ./Images

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Create a non-root user for security
RUN useradd -m -u 1000 weatheruser && \
    chown -R weatheruser:weatheruser /app
USER weatheruser

# Expose port
EXPOSE 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/database || exit 1

# Run the application
CMD ["gunicorn", "--certfile=fullchain.pem", "--keyfile=privkey.pem", "-b", "0.0.0.0:443", "server:app"] 