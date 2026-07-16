#!/bin/bash

#############################################
# Health Check Script for Resume Parser
# Monitors all services and reports status
#############################################

echo "🏥 Running health checks..."

PROJECT_DIR="/var/www/resume-parser"
LOG_FILE="/var/log/resume-parser-healthcheck.log"
ALERT_THRESHOLD=80 # CPU/Memory threshold in percentage

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create log file
mkdir -p /var/log
touch $LOG_FILE

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Function to check service health
check_service() {
    SERVICE_NAME=$1
    HEALTH_URL=$2
    EXPECTED_STATUS=${3:-200}
    
    if curl -f -s -o /dev/null -w "%{http_code}" $HEALTH_URL | grep -q $EXPECTED_STATUS; then
        echo -e "${GREEN}✅${NC} $SERVICE_NAME is healthy"
        log "✅ $SERVICE_NAME is healthy"
        return 0
    else
        echo -e "${RED}❌${NC} $SERVICE_NAME is unhealthy"
        log "❌ $SERVICE_NAME is unhealthy"
        return 1
    fi
}

# Function to check Docker container status
check_container() {
    CONTAINER_NAME=$1
    
    if docker ps | grep -q $CONTAINER_NAME; then
        STATUS=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "running")
        
        if [ "$STATUS" == "healthy" ] || [ "$STATUS" == "running" ]; then
            echo -e "${GREEN}✅${NC} Container $CONTAINER_NAME is $STATUS"
            log "✅ Container $CONTAINER_NAME is $STATUS"
            return 0
        else
            echo -e "${RED}❌${NC} Container $CONTAINER_NAME is $STATUS"
            log "❌ Container $CONTAINER_NAME is $STATUS"
            return 1
        fi
    else
        echo -e "${RED}❌${NC} Container $CONTAINER_NAME is not running"
        log "❌ Container $CONTAINER_NAME is not running"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ $DISK_USAGE -lt 80 ]; then
        echo -e "${GREEN}✅${NC} Disk space is sufficient (${DISK_USAGE}% used)"
        log "✅ Disk space is sufficient (${DISK_USAGE}% used)"
        return 0
    else
        echo -e "${YELLOW}⚠️${NC} Disk space is running low (${DISK_USAGE}% used)"
        log "⚠️ Disk space is running low (${DISK_USAGE}% used)"
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    MEMORY_USAGE=$(free | awk '/Mem/{printf("%.0f"), $3/$2*100}')
    
    if [ $MEMORY_USAGE -lt $ALERT_THRESHOLD ]; then
        echo -e "${GREEN}✅${NC} Memory usage is normal (${MEMORY_USAGE}%)"
        log "✅ Memory usage is normal (${MEMORY_USAGE}%)"
        return 0
    else
        echo -e "${YELLOW}⚠️${NC} Memory usage is high (${MEMORY_USAGE}%)"
        log "⚠️ Memory usage is high (${MEMORY_USAGE}%)"
        return 1
    fi
}

# Function to check swap usage
check_swap() {
    SWAP_USAGE=$(free | awk '/Swap/{printf("%.0f"), $3/$2*100}')
    
    if [ $SWAP_USAGE -lt 50 ]; then
        echo -e "${GREEN}✅${NC} Swap usage is normal (${SWAP_USAGE}%)"
        log "✅ Swap usage is normal (${SWAP_USAGE}%)"
        return 0
    else
        echo -e "${YELLOW}⚠️${NC} Swap usage is high (${SWAP_USAGE}%)"
        log "⚠️ Swap usage is high (${SWAP_USAGE}%)"
        return 1
    fi
}

# Function to check Docker service
check_docker() {
    if systemctl is-active --quiet docker; then
        echo -e "${GREEN}✅${NC} Docker service is running"
        log "✅ Docker service is running"
        return 0
    else
        echo -e "${RED}❌${NC} Docker service is not running"
        log "❌ Docker service is not running"
        return 1
    fi
}

# Function to get container resource usage
get_container_stats() {
    echo ""
    echo "📊 Container Resource Usage:"
    echo "============================"
    
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" \
        resume-parser-backend \
        resume-parser-ai-service \
        resume-parser-postgres \
        resume-parser-nginx 2>/dev/null || echo "Some containers are not running"
}

# Function to check database connections
check_database_connections() {
    if docker ps | grep -q resume-parser-postgres; then
        CONNECTIONS=$(docker exec resume-parser-postgres psql -U resume_parser -d resume_parser -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
        
        if [ ! -z "$CONNECTIONS" ]; then
            echo -e "${GREEN}✅${NC} Database connections: $CONNECTIONS"
            log "✅ Database connections: $CONNECTIONS"
            
            if [ $CONNECTIONS -lt 40 ]; then
                return 0
            else
                echo -e "${YELLOW}⚠️${NC} High number of database connections"
                return 1
            fi
        fi
    fi
}

# Function to check recent logs for errors
check_logs_for_errors() {
    echo ""
    echo "📋 Recent Error Logs:"
    echo "===================="
    
    # Check backend logs for errors
    if docker logs --tail 50 resume-parser-backend 2>&1 | grep -i "error\|exception\|failed" > /dev/null; then
        echo -e "${YELLOW}⚠️${NC} Errors found in backend logs"
        docker logs --tail 10 resume-parser-backend 2>&1 | grep -i "error\|exception\|failed" | tail -5
    else
        echo -e "${GREEN}✅${NC} No errors in recent backend logs"
    fi
    
    # Check AI service logs for errors
    if docker logs --tail 50 resume-parser-ai-service 2>&1 | grep -i "error\|exception\|failed" > /dev/null; then
        echo -e "${YELLOW}⚠️${NC} Errors found in AI service logs"
        docker logs --tail 10 resume-parser-ai-service 2>&1 | grep -i "error\|exception\|failed" | tail -5
    else
        echo -e "${GREEN}✅${NC} No errors in recent AI service logs"
    fi
}

# Main health check execution
main() {
    echo "=========================================="
    echo "   Resume Parser Health Check Report"
    echo "=========================================="
    echo ""
    
    # Overall health status
    OVERALL_HEALTH=0
    
    # Check Docker service
    check_docker || OVERALL_HEALTH=1
    
    echo ""
    echo "🔍 Service Status:"
    echo "=================="
    
    # Check containers
    check_container "resume-parser-postgres" || OVERALL_HEALTH=1
    check_container "resume-parser-backend" || OVERALL_HEALTH=1
    check_container "resume-parser-ai-service" || OVERALL_HEALTH=1
    check_container "resume-parser-nginx" || OVERALL_HEALTH=1
    
    echo ""
    echo "🌐 HTTP Health Endpoints:"
    echo "========================="
    
    # Check HTTP endpoints
    check_service "Backend API" "http://localhost:3001/health" || OVERALL_HEALTH=1
    check_service "AI Service" "http://localhost:8000/health" || OVERALL_HEALTH=1
    check_service "Nginx" "http://localhost/health" || OVERALL_HEALTH=1
    
    echo ""
    echo "💻 System Resources:"
    echo "===================="
    
    # Check system resources
    check_disk_space || OVERALL_HEALTH=1
    check_memory || OVERALL_HEALTH=1
    check_swap || OVERALL_HEALTH=1
    
    # Check database connections
    check_database_connections || OVERALL_HEALTH=1
    
    # Get container stats
    get_container_stats
    
    # Check logs for errors
    check_logs_for_errors
    
    echo ""
    echo "=========================================="
    
    if [ $OVERALL_HEALTH -eq 0 ]; then
        echo -e "${GREEN}🎉 Overall System Health: GOOD${NC}"
        log "🎉 Overall System Health: GOOD"
        exit 0
    else
        echo -e "${RED}⚠️  Overall System Health: ISSUES DETECTED${NC}"
        log "⚠️  Overall System Health: ISSUES DETECTED"
        exit 1
    fi
}

# Run main function
main