#!/bin/bash

#############################################
# Backup Script for Resume Parser
# Automated backup for databases and uploads
#############################################

set -e

echo "💾 Starting backup process..."

PROJECT_DIR="/var/www/resume-parser"
BACKUP_DIR="/var/backups/resume-parser"
LOG_FILE="/var/log/resume-parser-backup.log"
DATE=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=7

# Create directories
mkdir -p $BACKUP_DIR
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

# Function to backup PostgreSQL database
backup_database() {
    log "Backing up PostgreSQL database..."
    
    BACKUP_FILE="$BACKUP_DIR/database-backup-$DATE.sql"
    
    if docker ps | grep -q resume-parser-postgres; then
        docker exec resume-parser-postgres pg_dump -U resume_parser resume_parser > $BACKUP_FILE
        
        # Compress the backup
        gzip $BACKUP_FILE
        log "✅ Database backup completed: ${BACKUP_FILE}.gz"
    else
        log "❌ PostgreSQL container is not running"
        return 1
    fi
}

# Function to backup uploads
backup_uploads() {
    log "Backing up upload directories..."
    
    UPLOADS_BACKUP="$BACKUP_DIR/uploads-backup-$DATE.tar.gz"
    
    if [ -d "$PROJECT_DIR/backend/uploads" ] || docker volume ls | grep -q backend-uploads; then
        # Backup from docker volume
        docker run --rm \
            -v backend-uploads:/data \
            -v $BACKUP_DIR:/backup \
            alpine tar czf /backup/uploads-backup-$DATE.tar.gz -C /data .
        
        log "✅ Uploads backup completed: $UPLOADS_BACKUP"
    else
        log "⚠️  No uploads directory found"
    fi
}

# Function to backup model cache
backup_models() {
    log "Backing up model cache..."
    
    MODELS_BACKUP="$BACKUP_DIR/models-backup-$DATE.tar.gz"
    
    if docker volume ls | grep -q model-cache; then
        docker run --rm \
            -v model-cache:/data \
            -v $BACKUP_DIR:/backup \
            alpine tar czf /backup/models-backup-$DATE.tar.gz -C /data .
        
        log "✅ Model cache backup completed: $MODELS_BACKUP"
    else
        log "⚠️  No model cache found"
    fi
}

# Function to backup configuration files
backup_config() {
    log "Backing up configuration files..."
    
    CONFIG_BACKUP="$BACKUP_DIR/config-backup-$DATE.tar.gz"
    
    cd $PROJECT_DIR
    tar czf $CONFIG_BACKUP \
        .env \
        docker-compose.yml \
        nginx/ \
        backend/src/ecosystem.config.js \
        2>/dev/null || true
    
    log "✅ Configuration backup completed: $CONFIG_BACKUP"
}

# Function to clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    log "✅ Old backups cleaned up"
}

# Function to create backup summary
backup_summary() {
    log "Creating backup summary..."
    
    SUMMARY_FILE="$BACKUP_DIR/backup-summary-$DATE.txt"
    
    cat > $SUMMARY_FILE << EOF
Backup Summary - $DATE
========================

Database Backup: $(ls -lh $BACKUP_DIR/database-backup-$DATE.sql.gz 2>/dev/null || echo "Failed")
Uploads Backup: $(ls -lh $BACKUP_DIR/uploads-backup-$DATE.tar.gz 2>/dev/null || echo "Failed")
Models Backup: $(ls -lh $BACKUP_DIR/models-backup-$DATE.tar.gz 2>/dev/null || echo "Failed")
Config Backup: $(ls -lh $BACKUP_DIR/config-backup-$DATE.tar.gz 2>/dev/null || echo "Failed")

Total Disk Usage: $(du -sh $BACKUP_DIR | cut -f1)
Available Space: $(df -h $BACKUP_DIR | tail -1 | awk '{print $4}')
EOF
    
    log "✅ Backup summary created: $SUMMARY_FILE"
}

# Function to restore from backup
restore_backup() {
    BACKUP_DATE=$1
    
    if [ -z "$BACKUP_DATE" ]; then
        echo "Usage: $0 restore <backup-date>"
        echo "Example: $0 restore 20240619-143000"
        exit 1
    fi
    
    log "Restoring from backup: $BACKUP_DATE"
    
    # Restore database
    if [ -f "$BACKUP_DIR/database-backup-$BACKUP_DATE.sql.gz" ]; then
        log "Restoring database..."
        gunzip < $BACKUP_DIR/database-backup-$BACKUP_DATE.sql.gz | \
        docker exec -i resume-parser-postgres psql -U resume_parser resume_parser
        log "✅ Database restored"
    fi
    
    # Restore uploads
    if [ -f "$BACKUP_DIR/uploads-backup-$BACKUP_DATE.tar.gz" ]; then
        log "Restoring uploads..."
        docker run --rm \
            -v backend-uploads:/data \
            -v $BACKUP_DIR:/backup \
            alpine tar xzf /backup/uploads-backup-$BACKUP_DATE.tar.gz -C /data
        log "✅ Uploads restored"
    fi
    
    log "✅ Restore completed"
}

# Main execution
check_root

case "$1" in
    restore)
        restore_backup $2
        ;;
    database)
        backup_database
        cleanup_old_backups
        ;;
    uploads)
        backup_uploads
        cleanup_old_backups
        ;;
    models)
        backup_models
        cleanup_old_backups
        ;;
    config)
        backup_config
        cleanup_old_backups
        ;;
    all|*)
        backup_database
        backup_uploads
        backup_models
        backup_config
        cleanup_old_backups
        backup_summary
        log "🎉 Full backup completed successfully!"
        ;;
esac