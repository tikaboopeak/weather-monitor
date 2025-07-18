#!/usr/bin/env python3
"""
Performance monitoring script for Weather Alert Monitor
"""

import time
import requests
import json
import sys
from datetime import datetime

def test_endpoint(url, endpoint, method='GET', data=None, headers=None):
    """Test a single endpoint and measure response time"""
    full_url = f"{url}{endpoint}"
    
    try:
        start_time = time.time()
        
        if method == 'GET':
            response = requests.get(full_url, headers=headers, timeout=30)
        elif method == 'POST':
            response = requests.post(full_url, json=data, headers=headers, timeout=30)
        elif method == 'PUT':
            response = requests.put(full_url, json=data, headers=headers, timeout=30)
        
        end_time = time.time()
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        return {
            'endpoint': endpoint,
            'method': method,
            'status_code': response.status_code,
            'response_time_ms': round(response_time, 2),
            'success': response.status_code < 400
        }
    except requests.exceptions.Timeout:
        return {
            'endpoint': endpoint,
            'method': method,
            'status_code': 'TIMEOUT',
            'response_time_ms': 'TIMEOUT',
            'success': False
        }
    except Exception as e:
        return {
            'endpoint': endpoint,
            'method': method,
            'status_code': 'ERROR',
            'response_time_ms': 'ERROR',
            'success': False,
            'error': str(e)
        }

def run_performance_test(base_url, auth_token=None):
    """Run a comprehensive performance test"""
    print(f"🔍 Performance Test for: {base_url}")
    print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    headers = {}
    if auth_token:
        headers['Authorization'] = auth_token
    
    # Test endpoints
    endpoints = [
        ('/', 'GET'),
        ('/api/locations', 'GET'),
        ('/api/database', 'GET'),
        ('/script.js', 'GET'),
        ('/styles.css', 'GET'),
    ]
    
    results = []
    
    for endpoint, method in endpoints:
        print(f"Testing {method} {endpoint}...")
        result = test_endpoint(base_url, endpoint, method, headers=headers)
        results.append(result)
        
        if result['success']:
            print(f"  ✅ {result['response_time_ms']}ms")
        else:
            print(f"  ❌ Failed: {result.get('error', 'Unknown error')}")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 PERFORMANCE SUMMARY")
    print("=" * 60)
    
    successful_tests = [r for r in results if r['success'] and isinstance(r['response_time_ms'], (int, float))]
    
    if successful_tests:
        avg_time = sum(r['response_time_ms'] for r in successful_tests) / len(successful_tests)
        max_time = max(r['response_time_ms'] for r in successful_tests)
        min_time = min(r['response_time_ms'] for r in successful_tests)
        
        print(f"Average Response Time: {avg_time:.2f}ms")
        print(f"Fastest Response: {min_time:.2f}ms")
        print(f"Slowest Response: {max_time:.2f}ms")
        
        # Performance assessment
        if avg_time < 100:
            print("🎉 Performance: EXCELLENT")
        elif avg_time < 500:
            print("✅ Performance: GOOD")
        elif avg_time < 1000:
            print("⚠️  Performance: ACCEPTABLE")
        else:
            print("🐌 Performance: SLOW - Consider optimization")
    
    print(f"\n📋 Detailed Results:")
    for result in results:
        status_icon = "✅" if result['success'] else "❌"
        print(f"  {status_icon} {result['method']} {result['endpoint']}: {result['response_time_ms']}ms")
    
    return results

def check_docker_container():
    """Check Docker container resource usage"""
    print("\n🐳 DOCKER CONTAINER STATUS")
    print("=" * 60)
    
    try:
        import subprocess
        
        # Check if container is running
        result = subprocess.run(['docker', 'ps', '--filter', 'name=weather-alert-monitor', '--format', 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'], 
                              capture_output=True, text=True)
        
        if result.returncode == 0 and 'weather-alert-monitor' in result.stdout:
            print("✅ Container is running")
            print(result.stdout)
        else:
            print("❌ Container not found or not running")
            return False
        
        # Check resource usage
        print("\n📊 Resource Usage:")
        stats_result = subprocess.run(['docker', 'stats', 'weather-alert-monitor', '--no-stream', '--format', 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}'], 
                                    capture_output=True, text=True)
        
        if stats_result.returncode == 0:
            print(stats_result.stdout)
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking Docker: {e}")
        return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python performance_monitor.py <base_url> [auth_token]")
        print("Example: python performance_monitor.py https://your-nas-ip:443")
        sys.exit(1)
    
    base_url = sys.argv[1]
    auth_token = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Run performance test
    results = run_performance_test(base_url, auth_token)
    
    # Check Docker container if running locally
    if 'localhost' in base_url or '127.0.0.1' in base_url:
        check_docker_container()
    
    print(f"\n🏁 Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}") 