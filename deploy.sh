#!/bin/bash

# Weather Alert Monitor Docker Deployment Script

set -e

echo "🌤️  Weather Alert Monitor Docker Deployment"
echo "=========================================="

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker and try again."
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to build the image
build_image() {
    echo "🔨 Building Docker image..."
    docker build -t weather-alert-monitor .
    echo "✅ Image built successfully"
}

# Function to start the container
start_container() {
    echo "🚀 Starting Weather Alert Monitor..."
    docker-compose up -d
    echo "✅ Container started successfully"
}

# Function to stop the container
stop_container() {
    echo "🛑 Stopping Weather Alert Monitor..."
    docker-compose down
    echo "✅ Container stopped successfully"
}

# Function to show logs
show_logs() {
    echo "📋 Showing container logs..."
    docker-compose logs -f
}

# Function to show status
show_status() {
    echo "📊 Container status:"
    docker-compose ps
    echo ""
    echo "🌐 Application URL: http://localhost:8000"
}

# Function to clean up
cleanup() {
    echo "🧹 Cleaning up Docker resources..."
    docker-compose down --rmi all --volumes --remove-orphans
    echo "✅ Cleanup completed"
}

# Main script logic
case "${1:-help}" in
    "build")
        check_docker
        build_image
        ;;
    "start")
        check_docker
        build_image
        start_container
        show_status
        ;;
    "stop")
        stop_container
        ;;
    "restart")
        stop_container
        start_container
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "status")
        show_status
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|*)
        echo "Usage: $0 {build|start|stop|restart|logs|status|cleanup|help}"
        echo ""
        echo "Commands:"
        echo "  build    - Build the Docker image"
        echo "  start    - Build and start the container"
        echo "  stop     - Stop the container"
        echo "  restart  - Restart the container"
        echo "  logs     - Show container logs"
        echo "  status   - Show container status"
        echo "  cleanup  - Remove all containers, images, and volumes"
        echo "  help     - Show this help message"
        echo ""
        echo "After starting, visit: http://localhost:8000"
        ;;
esac 