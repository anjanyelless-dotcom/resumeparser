# File Upload System Test Guide

## Overview

The backend now provides a complete file upload system for resumes with automatic parsing queue integration. This guide shows how to test and use the upload endpoints.

## Environment Setup

### Required Environment Variables

```bash
# File upload configuration
MAX_FILE_SIZE_MB=10
FILE_UPLOAD_PATH=./uploads

# Redis and AI Service (for parsing)
REDIS_HOST=localhost
REDIS_PORT=6379
AI_SERVICE_URL=http://localhost:8000

# JWT
JWT_SECRET=your-secret-key
```

### Directory Structure

```
backend/src/
├── uploads/                    # File storage (auto-created)
├── middleware/
│   └── upload.middleware.ts   # Multer configuration
├── controllers/
│   └── upload.controller.ts   # Upload logic
└── routes/
    └── upload.routes.ts       # API endpoints
```

## API Endpoints

### 1. Upload Resume

```bash
POST http://localhost:3001/api/upload/resume
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

Body: FormData with field name "resume" and file
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Resume uploaded successfully and processing started",
  "data": {
    "candidateId": "uuid-here",
    "jobId": "job-uuid-here",
    "parsingJobId": "parsing-uuid-here",
    "status": "queued",
    "fileInfo": {
      "originalName": "resume.pdf",
      "size": 1048576,
      "type": "pdf"
    }
  }
}
```

**Response (Error):**

```json
{
  "error": "File too large",
  "message": "Maximum file size is 10MB",
  "code": "FILE_TOO_LARGE"
}
```

### 2. Get Upload Configuration

```bash
GET http://localhost:3001/api/upload/config
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "config": {
    "maxFileSizeMB": 10,
    "maxFileSizeBytes": 10485760,
    "allowedTypes": ["PDF", "DOCX", "TXT"],
    "allowedMimeTypes": [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    ],
    "uploadPath": "./uploads",
    "fieldName": "resume"
  },
  "instructions": {
    "method": "POST",
    "endpoint": "/api/upload/resume",
    "contentType": "multipart/form-data",
    "fieldName": "resume",
    "authentication": "Bearer token required"
  }
}
```

### 3. Get Upload Statistics (Admin/Manager only)

```bash
GET http://localhost:3001/api/upload/stats
Authorization: Bearer <admin-token>
```

**Response:**

```json
{
  "statistics": {
    "totalCandidates": 150,
    "candidatesWithFiles": 120,
    "candidatesWithoutFiles": 30,
    "parsingJobs": {
      "queued": 5,
      "processing": 3,
      "completed": 100,
      "failed": 12,
      "total": 120
    },
    "fileTypes": {
      "pdf": 80,
      "docx": 35,
      "txt": 5
    }
  }
}
```

## Testing Scenarios

### 1. Successful Upload

```bash
# 1. Get JWT token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# 2. Upload resume
curl -X POST http://localhost:3001/api/upload/resume \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "resume=@/path/to/resume.pdf"
```

### 2. File Size Validation

```bash
# Create a large file (>10MB)
dd if=/dev/zero of=large-resume.pdf bs=1M count=15

# Try to upload (should fail)
curl -X POST http://localhost:3001/api/upload/resume \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "resume=@large-resume.pdf"

# Expected response:
# {"error": "File too large", "message": "Maximum file size is 10MB", "code": "FILE_TOO_LARGE"}
```

### 3. File Type Validation

```bash
# Try to upload an invalid file type
curl -X POST http://localhost:3001/api/upload/resume \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "resume=@image.jpg"

# Expected response:
# {"error": "Invalid file type", "message": "Invalid file type: image/jpeg. Only PDF, DOCX, and TXT files are allowed.", "code": "INVALID_FILE_TYPE"}
```

### 4. Missing File

```bash
# Try to upload without file
curl -X POST http://localhost:3001/api/upload/resume \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "resume="

# Expected response:
# {"error": "No file uploaded", "message": "Please upload a resume file", "code": "NO_FILE_UPLOADED"}
```

### 5. Wrong Field Name

```bash
# Try to upload with wrong field name
curl -X POST http://localhost:3001/api/upload/resume \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "document=@resume.pdf"

# Expected response:
# {"error": "Unexpected field", "message": "File must be uploaded with field name \"resume\"", "code": "UNEXPECTED_FIELD"}
```

## Real-time Processing

### Socket.io Integration

When a resume is uploaded, the system automatically:

1. Creates a candidate record
2. Creates a parsing job record
3. Adds job to Redis queue
4. Emits real-time progress updates

### Monitor Progress

```javascript
// Connect to Socket.io
const socket = io("http://localhost:3001", {
  auth: { token: "your-jwt-token" },
});

// Listen for progress updates
socket.on("parsing:progress", (data) => {
  console.log(`Progress: ${data.progress}% - ${data.message}`);
});

// Listen for completion
socket.on("parsing:complete", (data) => {
  console.log("Parsing completed!", data.data);
});

// Listen for failures
socket.on("parsing:failed", (data) => {
  console.log("Parsing failed:", data.error);
});
```

## File Management

### Uploaded Files

- **Location**: `./uploads/` (configurable via `FILE_UPLOAD_PATH`)
- **Naming**: `{uuid}_{originalname}` (e.g., `123e4567-e89b-12d3-a456-426614174000_resume.pdf`)
- **Cleanup**: Failed uploads are automatically deleted

### File Types Supported

| Extension | MIME Type                                                                 | Description      |
| --------- | ------------------------------------------------------------------------- | ---------------- |
| `.pdf`    | `application/pdf`                                                         | PDF documents    |
| `.docx`   | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Word documents   |
| `.txt`    | `text/plain`                                                              | Plain text files |

## Frontend Integration Examples

### React Example

```javascript
import React, { useState } from "react";

const ResumeUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("resume", file);

    try {
      setUploading(true);
      const response = await fetch("/api/upload/resume", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        console.log("Upload successful:", result.data);
        // Start monitoring progress via Socket.io
      } else {
        console.error("Upload failed:", result.error);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleFileUpload}
        disabled={uploading}
      />
      {uploading && <div>Uploading...</div>}
      {progress && (
        <div>
          <div>Progress: {progress.progress}%</div>
          <div>{progress.message}</div>
        </div>
      )}
    </div>
  );
};
```

### Vue.js Example

```javascript
<template>
  <div>
    <input
      type="file"
      accept=".pdf,.docx,.txt"
      @change="handleFileUpload"
      :disabled="uploading"
    />
    <div v-if="uploading">Uploading...</div>
    <div v-if="progress">
      <div>Progress: {{ progress.progress }}%</div>
      <div>{{ progress.message }}</div>
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client'

export default {
  data() {
    return {
      uploading: false,
      progress: null,
      socket: null
    }
  },
  mounted() {
    this.socket = io('http://localhost:3001', {
      auth: { token: localStorage.getItem('token') }
    })

    this.socket.on('parsing:progress', (data) => {
      this.progress = data
    })

    this.socket.on('parsing:complete', () => {
      this.progress = null
      this.$emit('completed')
    })
  },
  methods: {
    async handleFileUpload(event) {
      const file = event.target.files[0]
      if (!file) return

      const formData = new FormData()
      formData.append('resume', file)

      try {
        this.uploading = true
        const response = await fetch('/api/upload/resume', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error)
        }

        console.log('Upload successful:', result.data)
      } catch (error) {
        console.error('Upload error:', error)
      } finally {
        this.uploading = false
      }
    }
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}
</script>
```

## Error Handling

### Common Error Codes

| Code                | Description               | HTTP Status |
| ------------------- | ------------------------- | ----------- |
| `NO_FILE_UPLOADED`  | No file provided          | 400         |
| `INVALID_FILE_TYPE` | Unsupported file type     | 400         |
| `FILE_TOO_LARGE`    | File exceeds size limit   | 400         |
| `TOO_MANY_FILES`    | Multiple files uploaded   | 400         |
| `UNEXPECTED_FIELD`  | Wrong field name          | 400         |
| `UPLOAD_FAILED`     | General upload error      | 400         |
| `DATABASE_ERROR`    | Database operation failed | 500         |

### Error Response Format

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "allowedTypes": ["PDF", "DOCX", "TXT"] // Only for INVALID_FILE_TYPE
}
```

## Production Considerations

### Security

- Files are stored with UUID prefixes to prevent name collisions
- File type validation prevents malicious uploads
- Authentication required for all upload operations
- File size limits prevent storage abuse

### Storage

- Configure `FILE_UPLOAD_PATH` for production storage
- Implement periodic cleanup of old files
- Consider cloud storage (S3, Google Cloud) for scalability
- Monitor disk usage and set up alerts

### Performance

- Files are processed asynchronously via Redis queue
- Multiple files can be uploaded concurrently
- Progress updates provide real-time feedback
- Failed uploads are automatically cleaned up

### Monitoring

- Track upload success/failure rates
- Monitor parsing queue depth
- Log file size and type statistics
- Set up alerts for storage limits

This upload system provides a complete, production-ready solution for resume file handling with automatic parsing integration.
