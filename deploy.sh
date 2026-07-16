#!/bin/bash

#############################################
# DigitalOcean Deployment Script
# For Resume Parser on 2GB Basic Droplet
#############################################

set -e

echo "🚀 Starting Resume Parser Deployment on DigitalOcean..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/resume-parser"
BACKUP_DIR="/var/backups/resume-parser"
LOG_FILE="/var/log/resume-parser-deployment.log"

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
        echo -e "${RED}Please run as root${NC}"
        exit 1
    fi
}

# Function to create swap space if needed
setup_swap() {
    log "Checking swap space..."
    SWAP_SIZE=$(free -m | awk '/Swap:/ {print $2}')
    
    if [ "$SWAP_SIZE" -lt 1024 ]; then
        log "Creating 2GB swap file for memory optimization..."
        if [ ! -f /swapfile ]; then
            fallocate -l 2G /swapfile
            chmod 600 /swapfile
            mkswap /swapfile
            swapon /swapfile
            echo '/swapfile none swap sw 0 0' >> /etc/fstab
            sysctl vm.swappiness=10
            echo 'vm.swappiness=10' >> /etc/sysctl.conf
            log "✅ Swap file created successfully"
        else
            log "Swap file already exists"
        fi
    else
        log "✅ Swap space is sufficient ($SWAP_SIZE MB)"
    fi
}

# Function to optimize system for 2GB RAM
optimize_system() {
    log "Optimizing system for 2GB RAM..."
    
    # Configure kernel parameters
    cat >> /etc/sysctl.conf << EOF
# Memory optimization for 2GB RAM
vm.swappiness=10
vm.vfs_cache_pressure=50
vm.dirty_ratio=15
vm.dirty_background_ratio=5
EOF
    
    sysctl -p
    log "✅ System optimization completed"
}

# Function to install Docker
install_docker() {
    if ! command -v docker &> /dev/null; then
        log "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        usermod -aG docker $USER
        systemctl enable docker
        systemctl start docker
        log "✅ Docker installed successfully"
    else
        log "✅ Docker is already installed"
    fi
}

# Function to install Docker Compose
install_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        log "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        log "✅ Docker Compose installed successfully"
    else
        log "✅ Docker Compose is already installed"
    fi
}

# Function to setup project directory
setup_project() {
    log "Setting up project directory..."
    mkdir -p $PROJECT_DIR
    mkdir -p $BACKUP_DIR
    mkdir -p $PROJECT_DIR/nginx/ssl
    mkdir -p $PROJECT_DIR/backups
    log "✅ Project directory structure created"
}

# Function to setup environment files
setup_env_files() {
    log "Setting up environment files..."
    
    if [ ! -f $PROJECT_DIR/.env ]; then
        cat > $PROJECT_DIR/.env << EOF
# Database Configuration
DB_PASSWORD=$(openssl rand -base64 32)

# JWT Secret
JWT_SECRET=$(openssl rand -base64 32)

# AI Service API Keys (Required)
GEMINI_API_KEY=your_gemini_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
EOF
        log "⚠️  Please update $PROJECT_DIR/.env with your actual API keys"
    else
        log "✅ Environment file already exists"
    fi
}

# Function to backup existing deployment
backup_deployment() {
    if [ -d "$PROJECT_DIR" ] && [ "$(ls -A $PROJECT_DIR)" ]; then
        log "Backing up existing deployment..."
        BACKUP_NAME="resume-parser-backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p $BACKUP_DIR/$BACKUP_NAME
        cp -r $PROJECT_DIR/* $BACKUP_DIR/$BACKUP_NAME/ 2>/dev/null || true
        
        # Backup databases if running
        if docker ps | grep -q resume-parser-postgres; then
            docker exec resume-parser-postgres pg_dump -U resume_parser resume_parser > $BACKUP_DIR/$BACKUP_NAME/database.sql 2>/dev/null || true
        fi
        
        log "✅ Backup created: $BACKUP_NAME"
        
        # Keep only last 5 backups
        ls -t $BACKUP_DIR/ | tail -n +6 | xargs -I {} rm -rf $BACKUP_DIR/{} 2>/dev/null || true
    fi
}

# Function to deploy application
deploy_app() {
    log "Deploying application..."
    
    cd $PROJECT_DIR
    
    # Stop existing services
    if [ -f "docker-compose.yml" ]; then
        docker-compose down 2>/dev/null || true
    fi
    
    # Build and start services
    docker-compose build --no-cache
    docker-compose up -d
    
    log "✅ Application deployed successfully"
}

# Function to verify deployment
verify_deployment() {
    log "Verifying deployment..."
    sleep 30
    
    # Check if all services are running
    if docker-compose ps | grep -q "Exit"; then
        log "❌ Some services failed to start"
        docker-compose logs
        exit 1
    fi
    
    # Check health endpoints
    if curl -f http://localhost:3001/health &> /dev/null; then
        log "✅ Backend is healthy"
    else
        log "❌ Backend health check failed"
    fi
    
    if curl -f http://localhost:8000/health &> /dev/null; then
        log "✅ AI Service is healthy"
    else
        log "❌ AI Service health check failed"
    fi
    
    log "✅ Deployment verification completed"
}

# Main deployment flow
main() {
    check_root
    setup_swap
    optimize_system
    install_docker
    install_docker_compose
    setup_project
    setup_env_files
    backup_deployment
    
    # Note: You need to clone your repository first
    if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
        log "⚠️  Please clone your repository to $PROJECT_DIR before running this script"
        log "   git clone <your-repo-url> $PROJECT_DIR"
        exit 1
    fi
    
    deploy_app
    verify_deployment
    
    log "🎉 Deployment completed successfully!"
    log "📊 Monitoring: docker-compose logs -f"
    log "🔍 Health check: ./healthcheck.sh"
}

# Run main function
main