# Weather Alert Monitor - QNAP Container Station Setup

## Prerequisites

1. **QNAP NAS with Container Station installed**
   - Container Station should be available in QTS App Center
   - Ensure your QNAP has at least 1GB RAM available

2. **SSH Access (Optional but Recommended)**
   - Enable SSH in QTS Control Panel
   - Use PuTTY or terminal to access your QNAP

## Method 1: Using Container Station GUI (Recommended)

### Step 1: Prepare Files
1. Upload your project files to your QNAP NAS
2. Create the following directory structure on your QNAP:
   ```
   /share/Container/weather-monitor/
   ├── data/
   │   └── database.json (will be created automatically)
   └── backups/
   ```

### Step 2: Build and Deploy
1. Open **Container Station** in QTS
2. Go to **Create** → **Application**
3. Click **Create Application**
4. Choose **Docker Compose**
5. Copy and paste the contents of `qnap-docker-compose.yml`
6. Click **Create**

### Step 3: Configure Volumes
1. In Container Station, go to **Applications**
2. Find your weather-monitor application
3. Click **Settings** → **Volumes**
4. Ensure the following mappings:
   - `/share/Container/weather-monitor/data/database.json` → `/app/database.json`
   - `/share/Container/weather-monitor/backups` → `/app/backups`

### Step 4: Start the Application
1. Click **Start** in Container Station
2. Wait for the container to start (check logs if needed)
3. Access the application at: `http://YOUR_QNAP_IP:8000`

## Method 2: Using SSH (Advanced)

### Step 1: SSH into your QNAP
```bash
ssh admin@YOUR_QNAP_IP
```

### Step 2: Navigate to project directory
```bash
cd /share/Container/weather-monitor
```

### Step 3: Build and run
```bash
# Build the image
docker build -t weather-alert-monitor .

# Run the container
docker run -d \
  --name weather-alert-monitor \
  -p 8000:8000 \
  -v /share/Container/weather-monitor/data/database.json:/app/database.json \
  -v /share/Container/weather-monitor/backups:/app/backups \
  -e FLASK_ENV=production \
  -e PYTHONUNBUFFERED=1 \
  --restart unless-stopped \
  weather-alert-monitor
```

## Accessing the Application

Once deployed, access your Weather Alert Monitor at:
**http://YOUR_QNAP_IP:8000**

Replace `YOUR_QNAP_IP` with your QNAP's IP address.

## Data Persistence

Your data is stored in:
- `/share/Container/weather-monitor/data/database.json` - Main database
- `/share/Container/weather-monitor/backups/` - Backup files

## Container Station Management

### Viewing Logs
1. Open Container Station
2. Go to **Applications**
3. Click on your weather-monitor application
4. Click **Logs** tab

### Stopping/Restarting
1. In Container Station → **Applications**
2. Select your application
3. Click **Stop** or **Restart**

### Updating the Application
1. Stop the current container
2. Rebuild the image with new code
3. Start the container again

## Troubleshooting

### Container won't start
1. Check Container Station logs
2. Verify port 8000 is not in use
3. Ensure sufficient disk space
4. Check memory usage

### Can't access the application
1. Verify the container is running
2. Check if port 8000 is accessible
3. Try accessing via QNAP IP address
4. Check firewall settings

### Data not persisting
1. Verify volume mappings in Container Station
2. Check file permissions on QNAP
3. Ensure database.json exists in the data directory

## Backup and Recovery

### Creating a backup
1. Stop the container in Container Station
2. Copy the database file:
   ```bash
   cp /share/Container/weather-monitor/data/database.json /share/Container/weather-monitor/backups/database_backup_$(date +%Y%m%d_%H%M%S).json
   ```
3. Restart the container

### Restoring from backup
1. Stop the container
2. Copy your backup file:
   ```bash
   cp /share/Container/weather-monitor/backups/your_backup_file.json /share/Container/weather-monitor/data/database.json
   ```
3. Restart the container

## Performance Optimization

1. **Memory**: Allocate at least 512MB RAM to the container
2. **Storage**: Use SSD storage if available for better performance
3. **Network**: Ensure stable network connection for weather API calls
4. **CPU**: Monitor CPU usage during weather data updates

## Security Considerations

1. **Network Access**: Consider using QNAP's firewall to restrict access
2. **User Permissions**: Use dedicated user account for container
3. **Regular Updates**: Keep Container Station and Docker updated
4. **Backup Strategy**: Implement regular automated backups

## Support

If you encounter issues:
1. Check Container Station logs
2. Verify QNAP system resources
3. Ensure proper file permissions
4. Test network connectivity
