# Weather Alert Monitor - Docker Deployment

This guide explains how to deploy the Weather Alert Monitor using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed
- At least 512MB of available RAM

## Quick Start

### Option 1: Using the deployment script (Recommended)

```bash
# Make the script executable (if not already done)
chmod +x deploy.sh

# Start the application
./deploy.sh start

# Check status
./deploy.sh status

# View logs
./deploy.sh logs

# Stop the application
./deploy.sh stop
```

### Option 2: Using Docker Compose directly

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## Available Commands

### Deployment Script Commands

- `./deploy.sh build` - Build the Docker image
- `./deploy.sh start` - Build and start the container
- `./deploy.sh stop` - Stop the container
- `./deploy.sh restart` - Restart the container
- `./deploy.sh logs` - Show container logs
- `./deploy.sh status` - Show container status
- `./deploy.sh cleanup` - Remove all containers, images, and volumes
- `./deploy.sh help` - Show help message

### Docker Compose Commands

- `docker-compose up -d` - Start in detached mode
- `docker-compose down` - Stop and remove containers
- `docker-compose logs -f` - Follow logs
- `docker-compose ps` - Show container status
- `docker-compose exec weather-monitor bash` - Access container shell

## Accessing the Application

Once the container is running, access the Weather Alert Monitor at:

**http://localhost:8000**

## Data Persistence

The following data is persisted outside the container:

- `database.json` - Location and weather data
- `backups/` - Backup files (optional)

## Configuration

### Environment Variables

You can modify the environment variables in `docker-compose.yml`:

```yaml
environment:
  - FLASK_ENV=production
  - PYTHONUNBUFFERED=1
```

### Port Configuration

To change the port, modify the ports section in `docker-compose.yml`:

```yaml
ports:
  - "YOUR_PORT:8000"
```

## Troubleshooting

### Container won't start

1. Check if port 8000 is already in use:
   ```bash
   lsof -i :8000
   ```

2. Check container logs:
   ```bash
   ./deploy.sh logs
   ```

3. Verify Docker is running:
   ```bash
   docker info
   ```

### Database issues

1. Check if `database.json` exists and is readable
2. Ensure the file has proper permissions
3. Restart the container to reload the database

### Performance issues

1. Increase Docker memory allocation
2. Check system resources
3. Monitor container resource usage:
   ```bash
   docker stats weather-alert-monitor
   ```

## Security Considerations

- The container runs as a non-root user (`weatheruser`)
- Only port 8000 is exposed
- Health checks are enabled
- Container restart policy is set to `unless-stopped`

## Backup and Recovery

### Creating a backup

```bash
# Stop the container
./deploy.sh stop

# Copy database file
cp database.json backups/database_backup_$(date +%Y%m%d_%H%M%S).json

# Restart the container
./deploy.sh start
```

### Restoring from backup

```bash
# Stop the container
./deploy.sh stop

# Restore database file
cp backups/your_backup_file.json database.json

# Restart the container
./deploy.sh start
```

## Production Deployment

For production deployment, consider:

1. **Reverse Proxy**: Use nginx or Apache as a reverse proxy
2. **SSL/TLS**: Add HTTPS support
3. **Monitoring**: Implement container monitoring
4. **Logging**: Configure proper logging
5. **Backup Strategy**: Implement automated backups

### Example with nginx reverse proxy

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  weather-monitor:
    build: .
    container_name: weather-alert-monitor
    expose:
      - "8000"
    volumes:
      - ./database.json:/app/database.json
    environment:
      - FLASK_ENV=production
    restart: unless-stopped
    networks:
      - weather-network

  nginx:
    image: nginx:alpine
    container_name: weather-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - weather-monitor
    restart: unless-stopped
    networks:
      - weather-network

networks:
  weather-network:
    driver: bridge
```

## Support

If you encounter issues:

1. Check the logs: `./deploy.sh logs`
2. Verify Docker installation
3. Ensure sufficient system resources
4. Check file permissions for `database.json` 