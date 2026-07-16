# Redis Job Queue System Test Guide

## Overview

The resume parsing system uses BullMQ with Redis for asynchronous job processing. When candidates are created with resume files, parsing jobs are automatically queued and processed by background workers.

## Environment Setup

### Required Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# AI Service URL
AI_SERVICE_URL=http://localhost:8000

# Worker Configuration
PARSE_WORKER_CONCURRENCY=2
```

### Redis Installation

```bash
# Install Redis (macOS)
brew install redis

# Start Redis
brew services start redis

# Or run directly
redis-server
```

## Queue Features

### Job Configuration

- **Queue Name**: `resume-parsing`
- **Retry Attempts**: 3 with exponential backoff
- **Job Timeout**: 5 minutes
- **Concurrency**: 2 jobs processed simultaneously
- **Rate Limiting**: Max 10 jobs per minute

### Progress Tracking

Jobs emit progress updates at key stages:

- 0% - Job started
- 10% - File validation
- 25% - AI service call initiated
- 50% - AI service response received
- 75% - Database update in progress
- 90% - Finalizing data
- 100% - Completed

## API Integration

### 1. Create Candidate with Resume (Automatic Queue)

```bash
POST http://localhost:3001/api/candidates
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "file_path": "/uploads/resume.pdf",
  "file_type": "pdf"
}
```

**Response with parsing job:**

```json
{
  "message": "Candidate created successfully and resume parsing initiated",
  "candidate": { ... },
  "parsing_job_id": "parse-uuid-1234567890"
}
```

### 2. Check Parsing Status

```bash
GET http://localhost:3001/api/candidates/<candidate-id>/parsing-status
Authorization: Bearer <token>
```

**Response:**

```json
{
  "candidate_id": "uuid-here",
  "parsing_status": {
    "id": "job-uuid",
    "status": "processing",
    "progress": 75,
    "confidence_score": null,
    "created_at": "2024-01-01T00:00:00.000Z",
    "completed_at": null
  }
}
```

## Queue Management

### Get Queue Statistics

```javascript
import { getQueueStats } from "./queues/parseQueue";

const stats = await getQueueStats();
console.log(stats);
// Output: { waiting: 5, active: 2, completed: 100, failed: 3, delayed: 0, total: 110 }
```

### Get Job Status

```javascript
import { getJobStatus } from "./queues/parseQueue";

const jobStatus = await getJobStatus("job-id");
console.log(jobStatus);
```

### Get All Jobs for Candidate

```javascript
import { getCandidateJobs } from "./queues/parseQueue";

const jobs = await getCandidateJobs("candidate-id");
```

### Queue Maintenance

```javascript
import {
  pauseQueue,
  resumeQueue,
  cleanCompletedJobs,
  cleanFailedJobs,
} from "./queues/parseQueue";

// Pause queue (maintenance mode)
await pauseQueue();

// Resume queue
await resumeQueue();

// Clean old jobs
await cleanCompletedJobs(24 * 60 * 60 * 1000); // 24 hours
await cleanFailedJobs(7 * 24 * 60 * 60 * 1000); // 7 days
```

## Worker Processing Flow

### 1. Job Reception

Worker receives job with:

- `candidateId`: UUID of candidate
- `filePath`: Path to resume file
- `fileType`: File type (pdf, docx, etc.)
- `userId`: User who initiated the job

### 2. Processing Steps

1. **File Validation** (10%)
   - Verify file exists and is readable
2. **AI Service Call** (25% - 50%)
   - Send file to Python AI service
   - Parse response and validate data
3. **Database Updates** (50% - 90%)
   - Update candidate basic info
   - Insert skills, work experience, education
4. **Completion** (100%)
   - Mark job as completed
   - Update parsing_jobs table

### 3. Error Handling

- On failure: Update `parsing_jobs` table with error message
- Retry logic: 3 attempts with exponential backoff
- Failed jobs are retained for debugging

## Database Schema Integration

### parsing_jobs Table

```sql
CREATE TABLE parsing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  confidence_score DECIMAL(3,2),
  parsed_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### Status Values

- `pending` - Job queued, waiting to start
- `processing` - Currently being processed
- `completed` - Successfully completed
- `failed` - Failed after all retries

## Testing Scenarios

### 1. Successful Parsing

```bash
# Create candidate with valid resume file
# Monitor queue stats
# Check parsing progress
# Verify candidate data updated
```

### 2. Retry Logic

```bash
# Create candidate with invalid file path
# Observe retry attempts in logs
# Check final failed status
```

### 3. High Volume Load

```bash
# Create multiple candidates simultaneously
# Monitor queue backlog
# Verify concurrent processing
```

### 4. Worker Recovery

```bash
# Start processing jobs
# Stop worker mid-process
# Restart worker
# Verify job recovery and completion
```

## Monitoring and Logging

### Log Messages

```
📋 Added parsing job job-id for candidate candidate-id
🔄 Starting resume parsing for candidate candidate-id
🤖 Calling AI service for file-path
✅ Successfully parsed resume for candidate candidate-id
🎉 Job job-id completed for candidate candidate-id
💥 Job job-id failed for candidate candidate-id: error-message
```

### Health Check

The system health includes worker status:

```bash
GET http://localhost:3001/health
```

## Production Considerations

### Redis Configuration

- Use Redis Cluster for high availability
- Configure persistence (RDB/AOF)
- Set memory limits and eviction policies
- Monitor Redis memory usage

### Worker Scaling

- Increase `PARSE_WORKER_CONCURRENCY` for more parallelism
- Deploy multiple worker instances
- Use Kubernetes for horizontal scaling

### Error Monitoring

- Set up alerts for high failure rates
- Monitor queue depth
- Track processing times
- Log errors to external systems

### Security

- Secure Redis with authentication
- Use TLS for Redis connections
- Validate file paths and types
- Sanitize AI service responses

This queue system provides reliable, scalable resume processing with comprehensive monitoring and error handling.
