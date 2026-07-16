#!/bin/bash

#############################################
# Service Restart Script
# Graceful restart for Resume Parser services
#############################################

set -e

echo "🔄 Restarting Resume Parser services..."

PROJECT_DIR="/var/www/resume-parser"
LOG_FILE="/var/log/resume-parser-restart.log"

# Create log file
mkdir -p /var/log
touch $LOG_FILE

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        echo "Please run as root"
        exit 1
    fi
}

# Function to graceful restart
graceful_restart() {
    cd $PROJECT_DIR
    
    log "Starting graceful restart..."
    
    # Restart backend gracefully
    log "Restarting backend..."
    docker-compose restart backend
    
    # Wait for backend to be healthy
    sleep 15
    
    # Restart AI service gracefully
    log "Restarting AI service..."
    docker-compose restart ai-service
    
    # Wait for AI service to be healthy
    sleep 30
    
    # Restart nginx
    log "Restarting nginx..."
    docker-compose restart nginx
    
    sleep 5
    
    log "✅ All services restarted successfully"
}

# Function to full restart (including rebuild)
full_restart() {
    cd $PROJECT_DIR
    
    log "Starting full restart with rebuild..."
    
    # Stop all services
    docker-compose down
    
    # Rebuild and start
    docker-compose build --no-cache
    docker-compose up -d
    
    # Wait for services to be healthy
    sleep 45
    
    log "✅ Full restart completed"
}

# Function to restart specific service
restart_service() {
    SERVICE=$1
    cd $PROJECT_DIR
    
    if [ -z "$SERVICE" ]; then
        echo "Usage: $0 [graceful|full|backend|ai-service|nginx|postgres]"
        exit 1
    fi
    
    log "Restarting $SERVICE..."
    docker-compose restart $SERVICE
    
    # Service-specific wait times
    case $SERVICE in
        backend)
            sleep 15
            ;;
        ai-service)
            sleep 30
            ;;
        postgres)
            sleep 20
            ;;
        nginx)
            sleep 5
            ;;
    esac
    
    log "✅ $SERVICE restarted successfully"
}

# Main execution
check_root

case "$1" in
    graceful)
        graceful_restart
        ;;
    full)
        full_restart
        ;;
    backend|ai-service|nginx|postgres)
        restart_service $1
        ;;
    *)
        echo "Usage: $0 [graceful|full|backend|ai-service|nginx|postgres]"
        echo ""
        echo "Commands:"
        echo "  graceful  - Graceful restart of all services (default)"
        echo "  full      - Full restart with rebuild"
        echo "  backend   - Restart only backend service"
        echo "  ai-service - Restart only AI service"
        echo "  nginx     - Restart only nginx"
        echo "  postgres  - Restart only postgres"
        exit 1
        ;;
esac

echo "🎉 Restart completed!"