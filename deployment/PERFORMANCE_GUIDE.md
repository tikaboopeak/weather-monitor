# Weather Alert Monitor - Performance Optimization Guide

## 🚀 Performance Optimizations Applied

### 1. **Gunicorn Configuration Optimizations**
- **Workers**: Increased from 2 to 4 for better concurrency
- **Preload**: Enabled to load application before forking workers
- **Timeout**: Reduced from 120s to 30s for faster error recovery
- **Keep-alive**: Reduced from 5s to 2s for better resource usage
- **Max requests**: Set to 1000 with jitter to prevent thundering herd

### 2. **Application-Level Optimizations**
- **Database Caching**: 5-second TTL cache for database and users
- **Thread-Safe Operations**: Proper locking for cache operations
- **Optimized Bulk Updates**: Dictionary lookup instead of linear search
- **Reduced File I/O**: Cached reads with automatic invalidation

### 3. **Container Optimizations**
- **Slim Base Image**: Using python:3.11-slim for smaller footprint
- **Layer Caching**: Optimized Docker layer ordering
- **Non-Root User**: Security best practice

## 🔍 Performance Monitoring

### Run Performance Tests
```bash
# Test your deployed application
python performance_monitor.py https://your-nas-ip:443

# Test with authentication
python performance_monitor.py https://your-nas-ip:443 your-auth-token
```

### Expected Performance Metrics
- **Excellent**: < 100ms average response time
- **Good**: 100-500ms average response time
- **Acceptable**: 500-1000ms average response time
- **Slow**: > 1000ms average response time

## 🐛 Common Performance Issues & Solutions

### 1. **Slow Initial Page Load**
**Symptoms**: First page load takes 5+ seconds
**Causes**: 
- Large database.json file
- SSL certificate validation
- Cold start of container

**Solutions**:
- Enable database caching (already implemented)
- Use HTTP/2 if supported by your NAS
- Consider pre-warming the application

### 2. **Slow API Responses**
**Symptoms**: API calls take 2+ seconds
**Causes**:
- File I/O bottlenecks
- Large JSON parsing
- Network latency

**Solutions**:
- Database caching (implemented)
- Optimized bulk updates (implemented)
- Consider database migration to SQLite/PostgreSQL for large datasets

### 3. **High Memory Usage**
**Symptoms**: Container using >500MB RAM
**Causes**:
- Large database in memory
- Multiple worker processes
- Memory leaks

**Solutions**:
- Monitor with `docker stats`
- Consider reducing workers if memory is limited
- Implement memory-efficient data structures

### 4. **High CPU Usage**
**Symptoms**: Container using >50% CPU consistently
**Causes**:
- Frequent database writes
- Weather API calls
- JSON parsing overhead

**Solutions**:
- Implement background task processing
- Cache weather data
- Optimize JSON operations

## 📊 Monitoring Commands

### Check Container Resources
```bash
# View container stats
docker stats weather-alert-monitor

# Check container logs
docker logs weather-alert-monitor --tail 100

# Check container processes
docker exec weather-alert-monitor ps aux
```

### Check Application Performance
```bash
# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-nas-ip:443/api/locations

# Test specific endpoints
time curl https://your-nas-ip:443/api/locations
```

## 🔧 Advanced Optimizations

### 1. **Database Optimization**
For large datasets (>1000 locations), consider:
- Migrating to SQLite with proper indexing
- Implementing pagination for API responses
- Using database connection pooling

### 2. **Caching Strategy**
- Implement Redis for session storage
- Cache weather API responses
- Use CDN for static assets

### 3. **Load Balancing**
- Use multiple container instances
- Implement health checks
- Consider reverse proxy (nginx)

## 🚨 Troubleshooting Slow Performance

### Step 1: Identify the Bottleneck
```bash
# Run performance test
python performance_monitor.py https://your-nas-ip:443

# Check container resources
docker stats weather-alert-monitor
```

### Step 2: Check Logs
```bash
# View application logs
docker logs weather-alert-monitor --tail 50

# Look for errors or warnings
docker logs weather-alert-monitor 2>&1 | grep -i error
```

### Step 3: Verify Configuration
- Check volume mappings are correct
- Verify SSL certificates are valid
- Ensure sufficient QNAP resources

### Step 4: Optimize Based on Findings
- **High CPU**: Reduce workers or optimize code
- **High Memory**: Reduce cache TTL or workers
- **High I/O**: Check volume performance
- **Network**: Check QNAP network settings

## 📈 Performance Benchmarks

### Expected Response Times
| Endpoint | Expected Time | Acceptable Range |
|----------|---------------|------------------|
| `/` (Homepage) | < 200ms | 100-500ms |
| `/api/locations` | < 100ms | 50-300ms |
| `/api/database` | < 50ms | 25-150ms |
| Static files | < 50ms | 25-100ms |

### Resource Usage Targets
| Resource | Target | Warning Level |
|----------|--------|---------------|
| CPU Usage | < 30% | > 70% |
| Memory Usage | < 300MB | > 500MB |
| Disk I/O | < 10MB/s | > 50MB/s |

## 🎯 Quick Wins

1. **Enable Gzip Compression** (if supported by QNAP)
2. **Optimize Images** (already done)
3. **Minimize JavaScript** (consider bundling)
4. **Use HTTP/2** (if supported)
5. **Implement Health Checks**

## 📞 Getting Help

If performance issues persist:
1. Run the performance monitor script
2. Check container resource usage
3. Review application logs
4. Consider the advanced optimizations above
5. Check QNAP system resources and network settings 