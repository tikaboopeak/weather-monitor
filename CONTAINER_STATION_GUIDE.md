# Weather Alert Monitor - Container Station Deployment Guide

## Prerequisites
- QNAP NAS with Container Station installed
- All project files uploaded to your QNAP

## Step-by-Step Container Station Deployment

### Step 1: Prepare Your QNAP Directory Structure

1. **Open File Station** in QTS
2. **Navigate to** `/Public/`
3. **Create a new folder** called `weather-monitor`
4. **Inside weather-monitor, create:**
   - `data` folder
   - `backups` folder
5. **Upload all your project files** to the `weather-monitor` folder:
   - `server.py`
   - `requirements.txt`
   - `index.html`
   - `script.js`
   - `styles.css`
   - `database.json` (if you have one)
   - All other project files

### Step 2: Open Container Station

1. **Open Container Station** in QTS
2. **Go to** "Create" → "Application"
3. **Click** "Create Application"

### Step 3: Configure the Application

1. **Choose** "Docker Compose"
2. **Copy and paste** the following YAML content:

```yaml
services:
  weather-monitor:
    image: python:3.11-slim
    container_name: weather-alert-monitor
    ports:
      - "8000:8000"
    volumes:
      - ./:/app
      - /Public/weather-monitor/data/database.json:/app/database.json
      - /Public/weather-monitor/backups:/app/backups
    working_dir: /app
    environment:
      - FLASK_ENV=production
      - PYTHONUNBUFFERED=1
    restart: unless-stopped
    command: >
      sh -c "pip install -r requirements.txt && python server.py"
```

3. **Click** "Create"

### Step 4: Configure Volumes (Important!)

1. **In Container Station**, go to "Applications"
2. **Find** your weather-monitor application
3. **Click** "Settings" → "Volumes"
4. **Verify** these volume mappings:
   - `./` → `/app` (your project files)
   - `/Public/weather-monitor/data/database.json` → `/app/database.json`
   - `/Public/weather-monitor/backups` → `/app/backups`

### Step 5: Start the Application

1. **Click** "Start" in Container Station
2. **Wait** for the container to start (this may take a few minutes on first run)
3. **Check** the "Logs" tab to monitor progress

### Step 6: Access Your Application

Once started, access your Weather Alert Monitor at:
**http://YOUR_QNAP_IP:8000**

## Troubleshooting

### Container Won't Start
1. **Check logs** in Container Station
2. **Verify** all project files are uploaded
3. **Ensure** the directory structure is correct
4. **Check** if port 8000 is available

### Can't Access the Application
1. **Verify** the container is running
2. **Check** if port 8000 is accessible
3. **Try** accessing via QNAP IP address
4. **Check** firewall settings

### Data Not Persisting
1. **Verify** volume mappings in Container Station
2. **Check** file permissions on QNAP
3. **Ensure** database.json exists in the data directory

## Management

### Viewing Logs
1. **Open Container Station**
2. **Go to** "Applications"
3. **Click** on your weather-monitor application
4. **Click** "Logs" tab

### Stopping/Restarting
1. **In Container Station** → "Applications"
2. **Select** your application
3. **Click** "Stop" or "Restart"

### Updating the Application
1. **Stop** the current container
2. **Upload** new project files to the weather-monitor folder
3. **Start** the container again

## Key Advantages of This Method

✅ **No manual building** - Uses pre-built Python image
✅ **No SSH required** - Everything done through Container Station GUI
✅ **Automatic restarts** - Container restarts if it crashes
✅ **Data persistence** - Your database and backups are preserved
✅ **Easy management** - All done through Container Station interface

## File Structure on QNAP

Your QNAP should have this structure:
```
/Public/weather-monitor/
├── server.py
├── requirements.txt
├── index.html
├── script.js
├── styles.css
├── database.json (if you have one)
├── data/
│   └── database.json (will be created automatically)
└── backups/
```

## Success Indicators

- Container status shows "Running" in Container Station
- Logs show "Starting Weather Alert Monitor Server..."
- You can access http://YOUR_QNAP_IP:8000 in your browser
- The web interface loads and shows your weather monitor 