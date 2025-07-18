# Quick Fix for App Instability

## 🚨 **Immediate Solution: Use HTTP Only**

The app is unstable due to SSL certificate issues. Here's the quick fix:

### **Option 1: Use HTTP-Only Dockerfile (Recommended)**

1. **Build HTTP-only image:**
   ```bash
   cd deployment
   docker build -f Dockerfile.http -t weather-alert-monitor-http .
   ```

2. **Save for transfer:**
   ```bash
   docker save weather-alert-monitor-http > weather-alert-monitor-http.tar
   ```

3. **Container Station Configuration:**
   - **Port Mapping:** `80:80` (HTTP)
   - **Volume Mappings:** Only data volume (remove SSL certs)
   - **Access:** `http://your-nas-ip:80`

### **Option 2: Fix Current Container**

1. **Stop the container**
2. **Edit container settings:**
   - Change port mapping from `443:443` to `80:80`
   - Remove SSL certificate volume mapping
   - Keep only data volume mapping
3. **Start container**
4. **Access via:** `http://your-nas-ip:80`

## 🔧 **What Was Fixed**

### **1. Increased Timeouts**
- **Worker timeout:** 30s → 120s (prevents worker crashes)
- **Keep-alive:** 2s → 5s (better connection handling)
- **Max requests:** 1000 → 500 (more conservative)

### **2. Reduced Workers**
- **Workers:** 4 → 2 (less resource contention)
- **Better for QNAP's limited resources**

### **3. Better Error Handling**
- **Added comprehensive logging**
- **Request size limits** (10MB max)
- **Graceful error recovery**
- **Database caching** for performance

### **4. SSL Issues Resolved**
- **HTTP-only option** eliminates SSL problems
- **No more certificate errors**
- **Faster, more stable connections**

## 📊 **Expected Results**

After applying the fix:
- ✅ **No more worker timeouts**
- ✅ **No SSL certificate errors**
- ✅ **Fast, stable loading**
- ✅ **Proper API responses**
- ✅ **Locations load correctly**

## 🎯 **Recommended Steps**

1. **Use HTTP-only configuration** for immediate stability
2. **Test the application** - should load quickly now
3. **Once stable, optionally** configure proper SSL certificates
4. **Monitor logs** for any remaining issues

## 📞 **If Issues Persist**

1. Check container logs: `docker logs weather-alert-monitor`
2. Verify volume mappings are correct
3. Ensure QNAP has sufficient resources
4. Test with HTTP first, then HTTPS

---

**Last Updated:** July 18, 2025 