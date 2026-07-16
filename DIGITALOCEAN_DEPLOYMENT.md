# DigitalOcean Deployment Guide
## Resume Parser on 2GB Basic Droplet

This guide provides step-by-step instructions for deploying the Resume Parser application on a DigitalOcean Basic Droplet (2GB RAM, 1 vCPU, 50GB SSD).

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Initial Setup](#server-initial-setup)
3. [Docker Installation](#docker-installation)
4. [Application Deployment](#application-deployment)
5. [SSL Configuration](#ssl-configuration)
6. [Vercel Configuration](#vercel-configuration)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- DigitalOcean account with API access
- Domain name configured (optional but recommended)
- Git repository access
- SSL certificates (Let's Encrypt recommended)
- API keys for AI services (Gemini, Anthropic, OpenAI, etc.)

### Required API Keys

You'll need the following API keys for the AI service:
- **Gemini API Key** (Required for experience extraction)
- **Anthropic API Key** (Optional, for Claude models)
- **OpenAI API Key** (Optional, for GPT models)
- **DeepSeek API Key** (Optional)

---

## Server Initial Setup

### 1. Create DigitalOcean Droplet

```bash
# Droplet Specifications:
# - Image: Ubuntu 22.04 LTS
# - Size: Basic - 2GB RAM, 1 vCPU, 50GB SSD
# - Region: Choose closest to your users
# - SSH Key: Add your SSH key for secure access
```

### 2. Connect to Your Droplet

```bash
ssh root@your-droplet-ip
```

### 3. Initial System Update

```bash
# Update system packages
apt update && apt upgrade -y

# Set timezone
timedatectl set-timezone UTC

# Create non-root user (recommended)
adduser deploy
usermod -aG sudo deploy
```

### 4. Configure Firewall

```bash
# Install UFW
apt install ufw -y

# Configure firewall rules
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw enable

# Check firewall status
ufw status
```

### 5. Optimize System for 2GB RAM

```bash
# Create swap file (critical for 2GB RAM)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Optimize swap usage
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf

# Additional kernel optimizations
cat >> /etc/sysctl.conf << EOF
vm.vfs_cache_pressure=50
vm.dirty_ratio=15
vm.dirty_background_ratio=5
EOF

# Apply kernel parameters
sysctl -p
```

---

## Docker Installation

### 1. Install Docker

```bash
# Install Docker using official script
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Enable Docker service
systemctl enable docker
systemctl start docker

# Add user to docker group
usermod -aG docker deploy
```

### 2. Install Docker Compose

```bash
# Download Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 3. Configure Docker for 2GB RAM

```bash
# Create Docker daemon configuration
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 3
}
EOF

# Restart Docker
systemctl restart docker
```

---

## Application Deployment

### 1. Clone Repository

```bash
# Create project directory
mkdir -p /var/www/resume-parser
cd /var/www/resume-parser

# Clone your repository
git clone https://github.com/yourusername/Lakshya-LLM-Resume-Parser.git .

# Or use SSH if you have SSH keys configured
# git clone git@github.com:yourusername/Lakshya-LLM-Resume-Parser.git .
```

### 2. Configure Environment Variables

```bash
# Create environment file
cat > .env << EOF
# Database Configuration
DB_PASSWORD=$(openssl rand -base64 32)

# JWT Secret
JWT_SECRET=$(openssl rand -base64 32)

# AI Service API Keys
GEMINI_API_KEY=your_actual_gemini_api_key_here
ANTHROPIC_API_KEY=your_actual_anthropic_api_key_here
OPENAI_API_KEY=your_actual_openai_api_key_here
DEEPSEEK_API_KEY=your_actual_deepseek_api_key_here

# Backend Configuration
NODE_ENV=production
PORT=3001
LLM_PROVIDER=gemini
EOF

# Secure the environment file
chmod 600 .env
```

### 3. Update Nginx Configuration

```bash
# Update domain name in nginx configuration
sed -i 's/your-domain.com/your-actual-domain.com/g' nginx/digitalocean-nginx.conf
```

### 4. Run Deployment Script

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### Manual Deployment (Alternative)

```bash
# Build and start services
docker-compose build --no-cache
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 5. Verify Deployment

```bash
# Run health check
./healthcheck.sh

# Manual health checks
curl http://localhost:3001/health
curl http://localhost:8000/health
curl http://localhost/health
```

---

## SSL Configuration

### 1. Install Certbot

```bash
# Install Certbot and Nginx plugin
apt install certbot python3-certbot-nginx -y
```

### 2. Obtain SSL Certificate

```bash
# Obtain certificate (replace with your domain)
certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts to configure SSL
```

### 3. Configure SSL for Docker Nginx

```bash
# Copy SSL certificates to nginx directory
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/chain.pem nginx/ssl/

# Set proper permissions
chmod 644 nginx/ssl/*.pem
```

### 4. Setup SSL Auto-Renewal

```bash
# Test auto-renewal
certbot renew --dry-run

# Setup cron job for auto-renewal
(crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet && docker-compose restart nginx") | crontab -
```

### 5. Restart Nginx with SSL

```bash
docker-compose restart nginx
```

---

## Vercel Configuration

### 1. Update Vercel Environment Variables

Go to your Vercel project dashboard and update the following environment variables:

```
VITE_API_URL=https://your-domain.com/api
VITE_SOCKET_URL=https://your-domain.com
VITE_APP_NAME=ResumeParser AI
```

### 2. Redeploy Frontend

```bash
# Push changes to trigger Vercel deployment
git add .
git commit -m "Update production environment variables"
git push origin main
```

### 3. Configure CORS in Backend

Ensure your backend CORS configuration includes your Vercel domain:

```typescript
// In backend/src/app.ts
const corsOptions = {
  origin: [
    "https://your-vercel-domain.vercel.app",
    "https://your-custom-domain.com"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
```

---

## Monitoring & Maintenance

### 1. Setup Monitoring

```bash
# Run regular health checks
./healthcheck.sh

# View container resource usage
docker stats

# View logs
docker-compose logs -f backend
docker-compose logs -f ai-service
docker-compose logs -f postgres
```

### 2. Setup Automated Backups

```bash
# Make backup script executable
chmod +x backup.sh

# Setup daily backup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * cd /var/www/resume-parser && ./backup.sh all") | crontab -

# Setup weekly backup cleanup
(crontab -l 2>/dev/null; echo "0 3 * * 0 find /var/backups/resume-parser -type f -mtime +7 -delete") | crontab -
```

### 3. Log Rotation

```bash
# Setup logrotate for Docker logs
cat > /etc/logrotate.d/docker-containers << EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size 10M
    missingok
    delaycompress
    copytruncate
}
EOF

# Setup logrotate for application logs
cat > /etc/logrotate.d/resume-parser << EOF
/var/log/resume-parser-*.log {
    rotate 14
    daily
    compress
    missingok
    notifempty
    copytruncate
}
EOF
```

### 4. System Updates

```bash
# Setup automatic security updates
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades

# Manual update procedure
apt update && apt upgrade -y
docker-compose pull
docker-compose up -d --build
```

---

## Troubleshooting

### Common Issues

#### 1. Services Won't Start

```bash
# Check service logs
docker-compose logs backend
docker-compose logs ai-service
docker-compose logs postgres

# Check resource usage
docker stats
free -h
df -h

# Restart services
./restart.sh graceful
```

#### 2. Memory Issues

```bash
# Check memory usage
free -h
docker stats --no-stream

# Check swap usage
swapon --show

# Restart services if needed
docker-compose restart ai-service
```

#### 3. Database Connection Issues

```bash
# Check PostgreSQL status
docker-compose logs postgres

# Test database connection
docker exec -it resume-parser-postgres psql -U resume_parser -d resume_parser

# Restart database
docker-compose restart postgres
```

#### 4. SSL Certificate Issues

```bash
# Renew SSL certificate manually
certbot renew

# Restart nginx
docker-compose restart nginx

# Check SSL configuration
docker exec resume-parser-nginx nginx -t
```

#### 5. AI Service Model Loading Issues

```bash
# Check AI service logs
docker-compose logs ai-service

# Verify model cache
docker exec resume-parser-ai-service ls -lh /app/models/cache

# Restart AI service
docker-compose restart ai-service
```

### Emergency Procedures

#### Full System Reset

```bash
# Stop all services
docker-compose down

# Backup current data
./backup.sh all

# Remove all containers and volumes
docker-compose down -v

# Rebuild and start
docker-compose build --no-cache
docker-compose up -d
```

#### Database Recovery

```bash
# List available backups
ls -lh /var/backups/resume-parser/

# Restore from backup
./backup.sh restore 20240619-143000
```

---

## Performance Optimization

### Memory Optimization

Current memory allocation for 2GB droplet:
- Backend: 512MB limit
- AI Service: 1GB limit
- PostgreSQL: ~256MB
- Nginx: 64MB
- System: ~200MB

### Database Optimization

PostgreSQL is already tuned for 2GB RAM in docker-compose.yml with:
- Shared buffers: 128MB
- Max connections: 50
- Work memory: 4MB
- Effective cache size: 256MB

### AI Service Optimization

The AI service is configured with:
- Single worker process
- CPU-only inference
- Batch size: 8
- Model caching enabled
- Memory-efficient transformers settings

---

## Security Considerations

1. **Firewall**: Only necessary ports are open (80, 443, 22)
2. **SSL**: All traffic encrypted with Let's Encrypt
3. **Environment Variables**: Sensitive data in .env file with restricted permissions
4. **Container Security**: Non-root users in containers, security headers configured
5. **API Keys**: Never commit API keys to repository
6. **Regular Updates**: Security patches applied automatically

---

## Support & Maintenance

### Regular Maintenance Tasks

- **Daily**: Monitor health checks, review logs
- **Weekly**: Review backup status, check disk usage
- **Monthly**: Review security updates, update dependencies
- **Quarterly**: Review and optimize performance, audit access logs

### Contact & Support

For issues related to:
- **Deployment**: Check this guide and troubleshooting section
- **Application Issues**: Review application logs and health checks
- **Infrastructure**: Check DigitalOcean droplet metrics and status

---

## Appendix

### Useful Commands

```bash
# View all running containers
docker ps

# View container logs
docker logs <container-name>

# Execute command in container
docker exec -it <container-name> /bin/bash

# Restart specific service
docker-compose restart <service-name>

# Rebuild specific service
docker-compose build <service-name>
docker-compose up -d <service-name>

# Remove all stopped containers
docker container prune

# Remove unused images
docker image prune -a

# View disk usage
docker system df

# Check Docker compose configuration
docker-compose config
```

### File Locations

- **Application**: `/var/www/resume-parser`
- **Backups**: `/var/backups/resume-parser`
- **Logs**: `/var/log/resume-parser-*.log`
- **Docker data**: `/var/lib/docker`
- **SSL certificates**: `/etc/letsencrypt/live/`

### Port Usage

- **80**: HTTP (redirects to HTTPS)
- **443**: HTTPS
- **3001**: Backend API (internal)
- **8000**: AI Service (internal)
- **5432**: PostgreSQL (internal)

---

**Deployment Guide Version**: 1.0  
**Last Updated**: 2024-06-19  
**Compatible With**: Lakshya-LLM-Resume-Parser v1.0