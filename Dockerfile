FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 443

# Start the application with Gunicorn and SSL
CMD ["gunicorn", "--certfile=ssl/cert.pem", "--keyfile=ssl/key.pem", "--bind", "0.0.0.0:443", "server:app"] 