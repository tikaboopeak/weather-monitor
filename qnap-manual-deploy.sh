#!/bin/bash

# Manual QNAP Deployment Script
# This script avoids Container Station build issues by using a pre-built image

echo "🌤️  Weather Alert Monitor - Manual QNAP Deployment"
echo "=================================================="

# Function to create directories on QNAP
create_directories() {
    echo "📁 Creating directories on QNAP..."
    echo "Run these commands on your QNAP (via SSH or File Station):"
    echo ""
    echo "mkdir -p /share/Container/weather-monitor"
    echo "mkdir -p /share/Container/weather-monitor/data"
    echo "mkdir -p /share/Container/weather-monitor/backups"
    echo ""
}

# Function to show manual deployment steps
show_manual_steps() {
    echo "📋 Manual Deployment Steps:"
    echo "=========================="
    echo ""
    echo "1. SSH into your QNAP:"
    echo "   ssh admin@YOUR_QNAP_IP"
    echo ""
    echo "2. Navigate to the project directory:"
    echo "   cd /share/Container/weather-monitor"
    echo ""
    echo "3. Pull the Python image and run:"
    echo "   docker run -d \\"
    echo "     --name weather-alert-monitor \\"
    echo "     -p 8000:8000 \\"
    echo "     -v \$(pwd):/app \\"
    echo "     -v /share/Container/weather-monitor/data/database.json:/app/database.json \\"
    echo "     -v /share/Container/weather-monitor/backups:/app/backups \\"
    echo "     -e FLASK_ENV=production \\"
    echo "     -e PYTHONUNBUFFERED=1 \\"
    echo "     --restart unless-stopped \\"
    echo "     python:3.11-slim \\"
    echo "     sh -c \"pip install -r requirements.txt && python server.py\""
    echo ""
    echo "4. Check if it's running:"
    echo "   docker ps"
    echo ""
    echo "5. View logs:"
    echo "   docker logs weather-alert-monitor"
    echo ""
    echo "6. Access the application:"
    echo "   http://YOUR_QNAP_IP:8000"
    echo ""
}

# Function to show Container Station alternative
show_container_station_alternative() {
    echo "🔧 Container Station Alternative (if manual deployment works):"
    echo "=========================================================="
    echo ""
    echo "1. Use the simplified docker-compose file: qnap-simple-compose.yml"
    echo "2. In Container Station:"
    echo "   - Create Application → Docker Compose"
    echo "   - Copy contents of qnap-simple-compose.yml"
    echo "   - This avoids the build step that's causing issues"
    echo ""
}

# Function to show troubleshooting
show_troubleshooting() {
    echo "🔍 Troubleshooting:"
    echo "=================="
    echo ""
    echo "If you get permission errors:"
    echo "1. Stop any existing containers:"
    echo "   docker stop weather-alert-monitor"
    echo "   docker rm weather-alert-monitor"
    echo ""
    echo "2. Clean up Docker system:"
    echo "   docker system prune -f"
    echo ""
    echo "3. Check available disk space:"
    echo "   df -h"
    echo ""
    echo "4. If ZFS issues persist, try:"
    echo "   - Restart Container Station in QTS"
    echo "   - Use manual deployment instead"
    echo ""
}

# Main script
case "${1:-help}" in
    "setup")
        create_directories
        echo ""
        show_manual_steps
        echo ""
        show_container_station_alternative
        echo ""
        show_troubleshooting
        ;;
    "help"|*)
        echo "Usage: $0 {setup|help}"
        echo ""
        echo "Commands:"
        echo "  setup  - Show manual deployment steps"
        echo "  help   - Show this help message"
        ;;
esac 