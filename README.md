# Weather Alert Monitor - Deployment Guide

## Local Development

1. (Optional) Generate self-signed SSL certs for local HTTPS:
   ```sh
   ./generate_certs.sh
   ```
   - If `ssl/cert.pem` and `ssl/key.pem` exist, the app will run on https://localhost:443
   - Otherwise, it will run on http://localhost:8000

2. Start the Flask server:
   ```sh
   python server.py
   ```

3. Open your browser to:
   - https://localhost/ (if using SSL)
   - http://localhost:8000/ (if not using SSL)

---

## Production Deployment (Docker + Gunicorn + SSL, no nginx)

1. **Generate SSL Certificates** (if not already present):
   ```sh
   ./generate_certs.sh
   ```

2. **Build the Docker image:**
   ```sh
   docker build --platform linux/amd64 -t weather-alert-monitor:latest .
   ```

3. **Save the Docker image as a tar file:**
   ```sh
   docker save -o weather-alert-monitor.tar weather-alert-monitor
   ```

4. **Run the container, mapping port 443:**
   ```sh
   docker run -d -p 443:443 --name weather-ssl weather-alert-monitor:latest
   ```

5. **Open port 443 on your server’s firewall** and ensure your domain (or public IP) points to this server.

6. **Access your app:**
   - https://your-server-domain-or-ip/
   - Accept the self-signed certificate warning in your browser.

---

## Build Checklist

- [ ] Run `./generate_certs.sh` to ensure SSL certs exist in `ssl/`.
- [ ] Run `docker build --platform linux/amd64 -t weather-alert-monitor:latest .`
- [ ] Run `docker save -o weather-alert-monitor.tar weather-alert-monitor`
- [ ] Run `docker run -d -p 443:443 --name weather-ssl weather-alert-monitor:latest`
- [ ] Open port 443 on your firewall/server.
- [ ] Test login for both admin and viewer users.
- [ ] Accept the self-signed cert in your browser.

---

## Deployment Checklist

- [x] All secrets and sensitive files (users.json, database.json) are present in the container.
- [x] SSL certs are present in `ssl/` (or generated at build/startup).
- [x] Port 443 is open to the internet.
- [x] Docker image is built and running with Gunicorn and SSL.
- [x] You have tested login for both admin and viewer users.
- [x] You have accepted the self-signed cert in your browser.

---

## Notes
- For real SSL, replace `ssl/cert.pem` and `ssl/key.pem` with your CA-signed certs.
- No nginx or reverse proxy is required; Gunicorn serves HTTPS directly.
- For local dev, you can still use Flask’s built-in server.
