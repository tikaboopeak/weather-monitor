#!/bin/bash

# Weather Alert Monitor SSL Docker Deployment Script

set -e

echo "🌤️  Weather Alert Monitor SSL Docker Deployment"
echo "=============================================="

# Function to check if SSL certificates exist
check_ssl_certs() {
    if [ ! -f "fullchain.pem" ] || [ ! -f "privkey.pem" ]; then
        echo "❌ SSL certificates not found!"
        echo "   Please ensure fullchain.pem and privkey.pem are in the current directory"
        exit 1
    fi
    echo "✅ SSL certificates found"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker and try again."
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to build the SSL image
build_ssl_image() {
    echo "🔨 Building SSL Docker image..."
    docker build -f Dockerfile.ssl -t weather-alert-monitor-ssl .
    echo "✅ SSL image built successfully"
}

# Function to start the SSL container
start_ssl_container() {
    echo "🚀 Starting Weather Alert Monitor with SSL..."
    docker-compose -f docker-compose-ssl.yml up -d
    echo "✅ SSL container started successfully"
}

# Function to stop the SSL container
stop_ssl_container() {
    echo "🛑 Stopping SSL Weather Alert Monitor..."
    docker-compose -f docker-compose-ssl.yml down
    echo "✅ SSL container stopped successfully"
}

# Function to show SSL logs
show_ssl_logs() {
    echo "📋 Showing SSL container logs..."
    docker-compose -f docker-compose-ssl.yml logs -f
}

# Function to show SSL status
show_ssl_status() {
    echo "📊 SSL Container status:"
    docker-compose -f docker-compose-ssl.yml ps
    echo ""
    echo "🌐 Application URL: https://localhost:443"
    echo "🔒 SSL is enabled"
}

# Function to clean up SSL resources
cleanup_ssl() {
    echo "🧹 Cleaning up SSL Docker resources..."
    docker-compose -f docker-compose-ssl.yml down --rmi all --volumes --remove-orphans
    echo "✅ SSL cleanup completed"
}

# Function to test SSL connection
test_ssl() {
    echo "🧪 Testing SSL connection..."
    if curl -k -f https://localhost:443/api/database; then
        echo "✅ SSL connection successful"
    else
        echo "❌ SSL connection failed"
    fi
}

# Main script logic
case "${1:-help}" in
    "build")
        check_docker
        check_ssl_certs
        build_ssl_image
        ;;
    "start")
        check_docker
        check_ssl_certs
        build_ssl_image
        start_ssl_container
        show_ssl_status
        ;;
    "stop")
        stop_ssl_container
        ;;
    "restart")
        stop_ssl_container
        start_ssl_container
        show_ssl_status
        ;;
    "logs")
        show_ssl_logs
        ;;
    "status")
        show_ssl_status
        ;;
    "test")
        test_ssl
        ;;
    "cleanup")
        cleanup_ssl
        ;;
    "help"|*)
        echo "Usage: $0 {build|start|stop|restart|logs|status|test|cleanup|help}"
        echo ""
        echo "Commands:"
        echo "  build    - Build the SSL Docker image"
        echo "  start    - Build and start the SSL container"
        echo "  stop     - Stop the SSL container"
        echo "  restart  - Restart the SSL container"
        echo "  logs     - Show SSL container logs"
        echo "  status   - Show SSL container status"
        echo "  test     - Test SSL connection"
        echo "  cleanup  - Remove all SSL containers, images, and volumes"
        echo "  help     - Show this help message"
        echo ""
        echo "After starting, visit: https://localhost:443"
        echo "Note: SSL certificates (fullchain.pem, privkey.pem) must be present"
        ;;
esac 