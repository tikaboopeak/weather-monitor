#!/bin/bash

# Weather Alert Monitor - QNAP Update Script
# This script helps update an existing QNAP deployment

set -e

echo "🌤️  Weather Alert Monitor - QNAP Update Script"
echo "=============================================="

# Function to check if we're on QNAP
check_qnap() {
    if [ -f "/etc/config/qpkg.conf" ]; then
        echo "✅ Running on QNAP NAS"
        return 0
    else
        echo "⚠️  Not running on QNAP NAS - this script is for QNAP updates"
        echo "   If you're updating remotely, use the Container Station GUI instead"
        return 1
    fi
}

# Function to stop existing container
stop_container() {
    echo "🛑 Stopping existing weather-alert-monitor container..."
    docker stop weather-alert-monitor 2>/dev/null || echo "Container not running"
    docker rm weather-alert-monitor 2>/dev/null || echo "Container not found"
    echo "✅ Old container stopped and removed"
}

# Function to remove old image
remove_old_image() {
    echo "🗑️  Removing old Docker image..."
    docker rmi weather-alert-monitor:latest 2>/dev/null || echo "Old image not found"
    echo "✅ Old image removed"
}

# Function to build new image
build_new_image() {
    echo "🔨 Building new Docker image (without SSL)..."
    docker build -t weather-alert-monitor:latest .
    echo "✅ New image built successfully"
}

# Function to start new container
start_new_container() {
    echo "🚀 Starting new container..."
    docker run -d \
        --name weather-alert-monitor \
        -p 8000:8000 \
        -v /share/Container/weather-monitor/data/database.json:/app/database.json \
        -v /share/Container/weather-monitor/backups:/app/backups \
        -e FLASK_ENV=production \
        -e PYTHONUNBUFFERED=1 \
        --restart unless-stopped \
        weather-alert-monitor:latest
    echo "✅ New container started"
}

# Function to show status
show_status() {
    echo "📊 Container status:"
    docker ps --filter name=weather-alert-monitor
    echo ""
    echo "🌐 Application URL: http://YOUR_QNAP_IP:8000"
    echo "📋 To view logs: docker logs weather-alert-monitor"
}

# Function to show logs
show_logs() {
    echo "📋 Container logs:"
    docker logs weather-alert-monitor
}

# Main script logic
case "${1:-help}" in
    "update")
        if check_qnap; then
            stop_container
            remove_old_image
            build_new_image
            start_new_container
            show_status
        fi
        ;;
    "stop")
        stop_container
        ;;
    "start")
        start_new_container
        show_status
        ;;
    "restart")
        stop_container
        start_new_container
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "status")
        show_status
        ;;
    "help"|*)
        echo "Usage: $0 {update|stop|start|restart|logs|status|help}"
        echo ""
        echo "Commands:"
        echo "  update   - Stop old container, build new image, start new container"
        echo "  stop     - Stop the container"
        echo "  start    - Start the container"
        echo "  restart  - Restart the container"
        echo "  logs     - Show container logs"
        echo "  status   - Show container status"
        echo "  help     - Show this help message"
        echo ""
        echo "Note: This script is designed for QNAP NAS deployment updates"
        echo "      If you're not on QNAP, use Container Station GUI instead"
        ;;
esac 