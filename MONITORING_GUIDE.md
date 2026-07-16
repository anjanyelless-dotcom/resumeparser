# Monitoring Guide
## Resume Parser - DigitalOcean Production Deployment

This guide provides comprehensive monitoring procedures for the Resume Parser application deployed on DigitalOcean.

---

## 📊 Table of Contents

1. [Monitoring Overview](#monitoring-overview)
2. [Health Monitoring](#health-monitoring)
3. [Resource Monitoring](#resource-monitoring)
4. [Application Monitoring](#application-monitoring)
5. [Log Monitoring](#log-monitoring)
6. [Alerting](#alerting)
7. [Troubleshooting](#troubleshooting)
8. [Performance Tuning](#performance-tuning)

---

## Monitoring Overview

### Architecture Components

The monitoring system covers:
- **Backend Service** (Node.js/Express on port 3001)
- **AI Service** (Python FastAPI on port 8000)
- **PostgreSQL Database** (port 5432)
- **Nginx Reverse Proxy** (ports 80/443)
- **System Resources** (CPU, Memory, Disk, Network)

### Monitoring Tools

- **Built-in Health Check Script**: `./healthcheck.sh`
- **Docker Stats**: Container resource usage
- **Docker Logs**: Application logs
- **System Commands**: System resource monitoring
- **Nginx Status**: Web server metrics

---

## Health Monitoring

### Automated Health Checks

Run the comprehensive health check script:

```bash
cd /var/www/resume-parser
./healthcheck.sh
```

This script checks:
- Container health status
- HTTP endpoint availability
- System resource usage
- Database connectivity
- Recent error logs

### Manual Health Checks

#### Backend Health

```bash
# Check backend health endpoint
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-06-19T10:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

#### AI Service Health

```bash
# Check AI service health endpoint
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "version": "1.0.0",
  "extractor_available": true,
  "supported_formats": ["pdf", "docx", "txt", "png", "jpg"]
}
```

#### Database Health

```bash
# Check PostgreSQL connection
docker exec resume-parser-postgres pg_isready -U resume_parser

# Check database connections
docker exec resume-parser-postgres psql -U resume_parser -d resume_parser -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Nginx Health

```bash
# Check nginx status
curl http://localhost/health

# Expected response: healthy
```

### Container Health Status

```bash
# Check all container health statuses
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Health}}"

# Detailed health inspection
docker inspect --format='{{.State.Health.Status}}' resume-parser-backend
docker inspect --format='{{.State.Health.Status}}' resume-parser-ai-service
docker inspect --format='{{.State.Health.Status}}' resume-parser-postgres
docker inspect --format='{{.State.Health.Status}}' resume-parser-nginx
```

---

## Resource Monitoring

### Memory Usage

#### System Memory

```bash
# Check overall memory usage
free -h

# Check memory usage details
cat /proc/meminfo

# Monitor memory in real-time
watch -n 2 free -h
```

**Expected for 2GB Droplet:**
- Total: ~2GB
- Used: ~1.2-1.6GB (60-80%)
- Free: ~400-800MB
- Swap: Should be minimal usage (<10%)

#### Container Memory Usage

```bash
# Check memory usage by container
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Continuous monitoring
docker stats
```

**Expected Memory Usage:**
- Backend: ~200-400MB
- AI Service: ~600-900MB
- PostgreSQL: ~150-250MB
- Nginx: ~20-40MB

### CPU Usage

#### System CPU

```bash
# Check CPU usage
top -bn1 | head -20

# Check CPU stats
mpstat 1 5

# Check CPU load
uptime
```

**Expected for 1 vCPU:**
- Load average: <1.0 normally
- Spike during AI processing: up to 2.0 temporarily

#### Container CPU Usage

```bash
# Check CPU usage by container
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}"

# Monitor CPU-intensive processes
docker exec resume-parser-ai-service top
```

### Disk Usage

```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Check directory sizes
du -sh /var/lib/docker
du -sh /var/www/resume-parser
du -sh /var/backups/resume-parser
```

**Expected Disk Usage:**
- Total: 50GB
- Docker: ~5-10GB
- Application: ~1-2GB
- Backups: ~2-5GB (depending on retention)
- Free: >30GB

### Network Monitoring

```bash
# Check network connections
netstat -tulpn

# Check Docker network
docker network ls
docker network inspect resume-parser-network

# Monitor network traffic
iftop  # if installed
nethogs # if installed
```

---

## Application Monitoring

### Backend Monitoring

#### Key Metrics

```bash
# Check backend logs for errors
docker logs resume-parser-backend --tail 100 | grep -i error

# Check request rate (from nginx logs)
tail -f /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c

# Check response times
docker logs resume-parser-backend --tail 1000 | grep "response time"
```

#### Performance Indicators

- **Response Time**: <200ms for API calls
- **Error Rate**: <1%
- **Uptime**: >99.9%
- **Memory Usage**: <400MB

### AI Service Monitoring

#### Key Metrics

```bash
# Check AI service logs
docker logs resume-parser-ai-service --tail 100

# Check model loading
docker logs resume-parser-ai-service | grep -i model

# Check parsing performance
docker logs resume-parser-ai-service | grep -i "processing time"
```

#### Performance Indicators

- **Model Load Time**: <60 seconds on startup
- **Parse Time**: <10 seconds per resume
- **Memory Usage**: <900MB
- **Error Rate**: <2% (due to model variations)

### Database Monitoring

#### Key Metrics

```bash
# Check database connections
docker exec resume-parser-postgres psql -U resume_parser -d resume_parser -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
docker exec resume-parser-postgres psql -U resume_parser -d resume_parser -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Check table sizes
docker exec resume-parser-postgres psql -U resume_parser -d resume_parser -c "SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Check database size
docker exec resume-parser-postgres psql -U resume_parser -d resume_parser -c "SELECT pg_size_pretty(pg_database_size('resume_parser'));"
```

#### Performance Indicators

- **Connection Count**: <40
- **Query Time**: <100ms average
- **Database Size**: Monitor growth rate
- **Cache Hit Ratio**: >99%

---

## Log Monitoring

### Application Logs

#### Backend Logs

```bash
# Real-time log monitoring
docker logs -f resume-parser-backend

# Last 100 lines
docker logs --tail 100 resume-parser-backend

# Error logs only
docker logs resume-parser-backend | grep -i error

# Warning logs
docker logs resume-parser-backend | grep -i warning
```

#### AI Service Logs

```bash
# Real-time log monitoring
docker logs -f resume-parser-ai-service

# Performance logs
docker logs resume-parser-ai-service | grep -i "processing time"

# Error logs
docker logs resume-parser-ai-service | grep -i error
```

#### Database Logs

```bash
# Database logs
docker logs resume-parser-postgres

# Slow query log
docker logs resume-parser-postgres | grep -i "slow"
```

### Nginx Logs

```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log

# Status code analysis
tail -1000 /var/log/nginx/access.log | awk '{print $9}' | sort | uniq -c | sort -rn

# IP address analysis
tail -1000 /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10
```

### System Logs

```bash
# System logs
journalctl -f

# Docker logs
journalctl -u docker -f

# Authentication logs
tail -f /var/log/auth.log
```

---

## Alerting

### Critical Alerts

Set up monitoring for these critical conditions:

#### Memory Alerts

```bash
# Create memory alert script
cat > /usr/local/bin/memory-alert.sh << 'EOF'
#!/bin/bash
MEMORY_USAGE=$(free | awk '/Mem/{printf("%.0f"), $3/$2*100}')
if [ $MEMORY_USAGE -gt 90 ]; then
    echo "CRITICAL: Memory usage is ${MEMORY_USAGE}%" | mail -s "Memory Alert - Resume Parser" admin@yourdomain.com
fi
EOF

chmod +x /usr/local/bin/memory-alert.sh

# Add to cron
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/memory-alert.sh") | crontab -
```

#### Disk Space Alerts

```bash
# Create disk space alert script
cat > /usr/local/bin/disk-alert.sh << 'EOF'
#!/bin/bash
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "WARNING: Disk usage is ${DISK_USAGE}%" | mail -s "Disk Space Alert - Resume Parser" admin@yourdomain.com
fi
EOF

chmod +x /usr/local/bin/disk-alert.sh

# Add to cron
(crontab -l 2>/dev/null; echo "*/10 * * * * /usr/local/bin/disk-alert.sh") | crontab -
```

#### Service Down Alerts

```bash
# Create service alert script
cat > /usr/local/bin/service-alert.sh << 'EOF'
#!/bin/bash
cd /var/www/resume-parser
./healthcheck.sh
if [ $? -ne 0 ]; then
    echo "CRITICAL: Health check failed" | mail -s "Service Alert - Resume Parser" admin@yourdomain.com
fi
EOF

chmod +x /usr/local/bin/service-alert.sh

# Add to cron
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/service-alert.sh") | crontab -
```

### Monitoring Dashboard

Consider setting up a simple monitoring dashboard:

```bash
# Install basic monitoring tools
apt install htop iotop nethogs -y

# Use htop for resource monitoring
htop

# Use iotop for disk I/O monitoring
sudo iotop

# Use nethogs for network monitoring
sudo nethogs
```

---

## Troubleshooting

### Common Issues

#### High Memory Usage

**Symptoms**: System using >90% memory, swap usage high

**Diagnosis**:
```bash
free -h
docker stats --no-stream
```

**Solutions**:
1. Restart AI service: `docker-compose restart ai-service`
2. Check for memory leaks in application logs
3. Reduce batch size in AI service configuration
4. Consider upgrading droplet size if persistent

#### High CPU Usage

**Symptoms**: Load average >1.0 sustained

**Diagnosis**:
```bash
top
docker stats --no-stream
```

**Solutions**:
1. Identify CPU-intensive container
2. Check for infinite loops or inefficient queries
3. Review AI service model usage
4. Optimize database queries

#### Database Connection Issues

**Symptoms**: Application unable to connect to database

**Diagnosis**:
```bash
docker logs resume-parser-postgres
docker exec resume-parser-postgres pg_isready -U resume_parser
```

**Solutions**:
1. Restart PostgreSQL: `docker-compose restart postgres`
2. Check connection limits in docker-compose.yml
3. Review database logs for errors
4. Verify network connectivity

#### Slow Response Times

**Symptoms**: API calls taking >1 second

**Diagnosis**:
```bash
docker logs resume-parser-backend | grep "response time"
docker logs resume-parser-ai-service | grep "processing time"
```

**Solutions**:
1. Check database query performance
2. Review AI service model performance
3. Check network latency
4. Review Nginx configuration

---

## Performance Tuning

### Memory Tuning

#### PostgreSQL Tuning

Current settings in docker-compose.yml are optimized for 2GB RAM:

```yaml
command: >
  postgres
  -c shared_buffers=128MB
  -c max_connections=50
  -c work_mem=4MB
  -c maintenance_work_mem=64MB
  -c effective_cache_size=256MB
```

Monitor and adjust based on actual usage.

#### AI Service Tuning

Current memory-efficient settings:

```python
DEVICE=cpu
BATCH_SIZE=8  # Reduce if memory constrained
WORKERS=1     # Single worker for memory constraint
```

### Database Query Optimization

```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### Nginx Optimization

Current settings in nginx.conf are optimized for 2GB RAM:

```nginx
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
client_max_body_size 10M;
```

---

## Scheduled Monitoring Tasks

### Daily Tasks

```bash
# Run health check
0 6 * * * cd /var/www/resume-parser && ./healthcheck.sh >> /var/log/daily-health.log

# Check disk space
0 7 * * * df -h >> /var/log/daily-disk.log

# Check backup status
0 8 * * * ls -lh /var/backups/resume-parser/ >> /var/log/daily-backup.log
```

### Weekly Tasks

```bash
# Review resource usage trends
0 9 * * 1 docker stats --no-stream >> /var/log/weekly-resources.log

# Review error logs
0 10 * * 1 docker logs --since 7d resume-parser-backend | grep -i error >> /var/log/weekly-errors.log
```

### Monthly Tasks

```bash
# Performance review
0 11 1 * * docker system df >> /var/log/monthly-docker.log

# Security updates check
0 12 1 * * apt list --upgradable >> /var/log/monthly-updates.log
```

---

## Emergency Procedures

### Service Restart

```bash
# Graceful restart
cd /var/www/resume-parser
./restart.sh graceful

# Full restart with rebuild
./restart.sh full
```

### Emergency Shutdown

```bash
# Stop all services
docker-compose down

# Stop Docker
systemctl stop docker
```

### Data Recovery

```bash
# List available backups
ls -lh /var/backups/resume-parser/

# Restore from backup
./backup.sh restore 20240619-143000
```

---

**Monitoring Guide Version**: 1.0  
**Last Updated**: 2024-06-19  
**Next Review**: 2024-09-19