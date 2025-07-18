# Weather Alert Monitor - Troubleshooting Guide

## 🐌 Slow Loading Issues

### **Problem: Site loads incredibly slowly**
**Symptoms:**
- Page takes 10+ seconds to load
- SSL errors in container logs
- `[SSL: HTTP_REQUEST] http request` warnings

**Root Cause:** SSL/HTTPS configuration mismatch

### **Solution 1: Use HTTP (Recommended for testing)**

#### **Option A: Remove SSL certificates**
1. Stop the container
2. Remove SSL certificate volume mapping
3. Map port 80 instead of 443
4. Restart container

#### **Option B: Use HTTP port mapping**
**Container Station Configuration:**
- **Port Mapping:** Host Port `80` → Container Port `80`
- **Protocol:** HTTP
- **Volume Mappings:** Keep only data volume (remove certs volume)

### **Solution 2: Fix SSL Configuration**

#### **Verify SSL Certificates**
```bash
# Check if certificates exist and are valid
ls -la /share/Container/weather-alert-monitor/certs/
openssl x509 -in /share/Container/weather-alert-monitor/certs/fullchain.pem -text -noout
```

#### **Correct Volume Mappings**
| Host Path | Container Path | Access Mode |
|-----------|----------------|-------------|
| `/share/Container/weather-alert-monitor/data` | `/app/data` | Read/Write |
| `/share/Container/weather-alert-monitor/certs` | `/cert` | Read Only |

## 🔧 Quick Fixes

### **Immediate Fix (HTTP)**
1. **Stop container** in Container Station
2. **Edit container settings:**
   - Change port mapping: `80:80` (HTTP)
   - Remove SSL certificate volume mapping
   - Keep only data volume mapping
3. **Start container**
4. **Access via:** `http://your-nas-ip:80`

### **SSL Fix (HTTPS)**
1. **Verify certificates** are in correct location
2. **Check certificate permissions** (should be readable)
3. **Ensure volume mappings** are correct
4. **Access via:** `https://your-nas-ip:443`

## 📊 Performance Monitoring

### **Check Container Status**
```bash
# View container logs
docker logs weather-alert-monitor --tail 50

# Check resource usage
docker stats weather-alert-monitor

# Test connectivity
curl -I http://your-nas-ip:80
curl -I https://your-nas-ip:443
```

### **Expected Log Messages**
**HTTP Mode:**
```
Starting Weather Alert Monitor...
SSL certificates not found. Starting with HTTP on port 80...
[INFO] Listening at: http://0.0.0.0:80
```

**HTTPS Mode:**
```
Starting Weather Alert Monitor...
SSL certificates found. Starting with HTTPS on port 443...
[INFO] Listening at: https://0.0.0.0:443
```

## 🚨 Common Error Messages

### **SSL Errors**
```
[WARNING] Invalid request from ip=xxx.xxx.xxx.xxx: [SSL: HTTP_REQUEST] http request
```
**Fix:** Use HTTP port 80 or ensure HTTPS access

### **Certificate Errors**
```
[ERROR] SSL certificate file not found
```
**Fix:** Check certificate volume mapping and file existence

### **Permission Errors**
```
[ERROR] Permission denied reading certificate
```
**Fix:** Check certificate file permissions

## 🎯 Recommended Configuration

### **For Testing/Development:**
- **Port:** 80 (HTTP)
- **Volumes:** Data only
- **Access:** `http://your-nas-ip:80`

### **For Production:**
- **Port:** 443 (HTTPS)
- **Volumes:** Data + SSL certificates
- **Access:** `https://your-nas-ip:443`

## 📞 Getting Help

If issues persist:
1. Check container logs for specific errors
2. Verify volume mappings are correct
3. Test with HTTP first, then HTTPS
4. Ensure QNAP has sufficient resources
5. Check network connectivity

---

**Last Updated:** July 18, 2025 