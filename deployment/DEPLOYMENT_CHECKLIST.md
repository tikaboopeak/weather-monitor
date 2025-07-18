# Weather Alert Monitor - Deployment Checklist

## ✅ Pre-Deployment Verification

### 1. **API Configuration Fixed**
- [x] Removed hardcoded port 8000 from production script.js
- [x] Added conditional port logic for localhost vs production
- [x] API will use current protocol and hostname automatically

### 2. **Performance Optimizations Applied**
- [x] Gunicorn workers increased to 4
- [x] Database caching implemented (5-second TTL)
- [x] Optimized bulk updates with dictionary lookup
- [x] Preload enabled for faster startup

### 3. **Files Updated in Deployment Directory**
- [x] `script.js` - Fixed API configuration
- [x] `server.py` - Added performance optimizations
- [x] `Dockerfile` - Optimized Gunicorn settings
- [x] `requirements.txt` - Added requests library
- [x] All static assets and data files

## 🚀 Deployment Steps

### Step 1: Build New Docker Image
```bash
cd deployment
docker build -t weather-alert-monitor .
```

### Step 2: Save Image for Transfer
```bash
docker save weather-alert-monitor > weather-alert-monitor.tar
```

### Step 3: Transfer to QNAP
- Copy `weather-alert-monitor.tar` to your QNAP NAS
- Import the image in Container Station

### Step 4: Configure Container
**Container Name:** `weather-alert-monitor`

**Port Mapping:**
- Host Port: `443`
- Container Port: `443`
- Protocol: `HTTPS`

**Volume Mappings:**
| Host Path | Container Path | Access Mode |
|-----------|----------------|-------------|
| `/share/Container/weather-alert-monitor/data` | `/app/data` | Read/Write |
| `/share/Container/weather-alert-monitor/certs` | `/cert` | Read Only |

### Step 5: Copy Required Files to QNAP
```bash
# On QNAP (via SSH or File Station)
mkdir -p /share/Container/weather-alert-monitor/data
mkdir -p /share/Container/weather-alert-monitor/certs

# Copy data files
cp database.json /share/Container/weather-alert-monitor/data/
cp users.json /share/Container/weather-alert-monitor/data/

# Copy SSL certificates
cp fullchain.pem /share/Container/weather-alert-monitor/certs/
cp privkey.pem /share/Container/weather-alert-monitor/certs/
```

## 🔍 Post-Deployment Testing

### 1. **Basic Connectivity Test**
```bash
# Test if container is running
docker ps | grep weather-alert-monitor

# Check container logs
docker logs weather-alert-monitor --tail 20
```

### 2. **API Configuration Test**
Open browser console on your deployed app and run:
```javascript
// Copy and paste this into browser console
async function testAPI() {
    const apiBase = `${window.location.protocol}//${window.location.hostname}/api`;
    console.log('Testing API:', apiBase);
    
    try {
        const response = await fetch(`${apiBase}/locations`);
        const data = await response.json();
        console.log('✅ API Working:', data.length, 'locations found');
    } catch (error) {
        console.error('❌ API Error:', error);
    }
}
testAPI();
```

### 3. **Performance Test**
```bash
# Run performance monitor (if you have it on QNAP)
python performance_monitor.py https://your-nas-ip:443
```

## 🐛 Troubleshooting Common Issues

### Issue: "No sites from database loading"
**Cause:** API configuration pointing to wrong port
**Solution:** ✅ Fixed - API now uses current hostname without hardcoded port

### Issue: "CORS errors"
**Cause:** Cross-origin requests blocked
**Solution:** ✅ Fixed - CORS enabled in Flask app

### Issue: "SSL certificate errors"
**Cause:** Invalid or missing certificates
**Solution:** Verify certificate files are in `/cert/` directory

### Issue: "Slow response times"
**Cause:** Performance bottlenecks
**Solution:** ✅ Fixed - Optimizations applied

## 📊 Expected Results

### API Response Times
- **Homepage load:** < 200ms
- **Locations API:** < 100ms
- **Database API:** < 50ms
- **Static files:** < 50ms

### Container Resources
- **CPU Usage:** < 30%
- **Memory Usage:** < 300MB
- **Disk I/O:** < 10MB/s

### Functionality
- [ ] Locations load from database
- [ ] Weather data fetches correctly
- [ ] Canadian weather alerts work
- [ ] Mexican weather alerts work
- [ ] Real-time updates function
- [ ] User authentication works

## 🎯 Success Criteria

1. **No console errors** about API endpoints
2. **Locations appear** on the map
3. **Weather data loads** for all locations
4. **Response times** under 500ms average
5. **SSL certificate** shows as valid
6. **All features** work as expected

## 📞 If Issues Persist

1. Check container logs: `docker logs weather-alert-monitor`
2. Verify volume mappings in Container Station
3. Test API endpoints manually
4. Check QNAP system resources
5. Verify SSL certificate validity
6. Run performance monitor script

---

**Last Updated:** July 17, 2025
**Version:** 2.0 (Performance Optimized) 