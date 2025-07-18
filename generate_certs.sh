#!/bin/sh
set -e

mkdir -p ssl
if [ ! -f ssl/cert.pem ] || [ ! -f ssl/key.pem ]; then
  echo "Generating self-signed SSL certificate..."
  openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/CN=localhost"
else
  echo "SSL certificate already exists."
fi 