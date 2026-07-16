# Socket.io Real-time Updates Test Guide

## Overview

The backend now provides real-time parsing progress updates via Socket.io. This guide shows how to test and integrate the real-time features.

## Server Setup

### 1. Start Redis Server

```bash
# Redis should already be running
brew services start redis
# or
redis-server
```

### 2. Start Backend Server

```bash
# Set environment variables
export REDIS_HOST=localhost
export REDIS_PORT=6379
export JWT_SECRET=your-secret-key
export AI_SERVICE_URL=http://localhost:8000

# Start the server
npm start
```

### 3. Verify Socket.io is Running

You should see these logs:

```
🚀 Server running on port 3001
🔌 Socket.io server initialized
🔄 Resume parsing worker started
```

## Testing Socket.io Connection

### 1. Browser Console Test

Open browser developer tools and run:

```javascript
// Connect to Socket.io (replace with your JWT token)
const socket = io("http://localhost:3001", {
  auth: {
    token: "your-jwt-token-here",
  },
});

// Listen for connection
socket.on("connect", () => {
  console.log("Connected!", socket.id);
});

// Listen for welcome message
socket.on("connected", (data) => {
  console.log("Welcome:", data);
});

// Listen for parsing progress
socket.on("parsing:progress", (data) => {
  console.log("Progress:", data);
});

// Listen for completion
socket.on("parsing:complete", (data) => {
  console.log("Complete:", data);
});

// Listen for failures
socket.on("parsing:failed", (data) => {
  console.log("Failed:", data);
});
```

### 2. Test with Postman/Insomnia

Use WebSocket connection to `ws://localhost:3001/socket.io/?EIO=4&transport=websocket`

## End-to-End Testing

### 1. Register/Login for JWT Token

```bash
# Register
POST http://localhost:3001/api/auth/register
{
  "email": "test@example.com",
  "password": "password123",
  "role": "recruiter"
}

# Login
POST http://localhost:3001/api/auth/login
{
  "email": "test@example.com",
  "password": "password123"
}

# Copy the token from response
```

### 2. Connect with Socket.io

```javascript
const token = "your-jwt-token-from-login";
const socket = io("http://localhost:3001", {
  auth: { token },
});
```

### 3. Create Candidate with Resume

```bash
POST http://localhost:3001/api/candidates
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "file_path": "/path/to/resume.pdf",
  "file_type": "pdf"
}
```

### 4. Monitor Real-time Events

You should receive events like:

```javascript
// Progress events
{
  candidateId: "uuid-here",
  progress: 0,
  message: "Starting resume parsing..."
}

{
  candidateId: "uuid-here",
  progress: 25,
  message: "Sending resume to AI service for analysis..."
}

{
  candidateId: "uuid-here",
  progress: 50,
  message: "AI analysis complete, processing results..."
}

{
  candidateId: "uuid-here",
  progress: 75,
  message: "Updating candidate profile with parsed data..."
}

// Completion event
{
  candidateId: "uuid-here",
  data: {
    full_name: "John Doe",
    email: "john@example.com",
    skills: [...],
    work_experience: [...],
    education: [...]
  }
}

// Or failure event
{
  candidateId: "uuid-here",
  error: "AI service unavailable"
}
```

## Room-based Testing

### 1. Join Candidate Room (Admin/Manager)

```javascript
// After connecting
socket.emit("join:candidate", "candidate-uuid-here");

// Now you'll receive events for this candidate even if you didn't create them
socket.on("parsing:progress", (data) => {
  console.log(`Candidate ${data.candidateId}: ${data.progress}%`);
});
```

### 2. Leave Candidate Room

```javascript
socket.emit("leave:candidate", "candidate-uuid-here");
```

## Error Handling Tests

### 1. Invalid Token

```javascript
const socket = io("http://localhost:3001", {
  auth: { token: "invalid-token" },
});

socket.on("connect_error", (error) => {
  console.log("Expected error:", error.message); // "Invalid or expired token"
});
```

### 2. No Token

```javascript
const socket = io("http://localhost:3001"); // No auth

socket.on("connect_error", (error) => {
  console.log("Expected error:", error.message); // "Authentication token required"
});
```

### 3. Expired Token

Use an expired JWT token to test reconnection handling.

## Performance Testing

### 1. Multiple Concurrent Connections

```javascript
// Create multiple connections
const connections = [];
for (let i = 0; i < 10; i++) {
  const socket = io("http://localhost:3001", {
    auth: { token: "your-jwt-token" },
  });
  connections.push(socket);
}

// Create multiple candidates simultaneously
connections.forEach((socket, index) => {
  // Use HTTP API to create candidates
  // Monitor that each connection receives its own events
});
```

### 2. High-frequency Progress Updates

The worker emits progress at these stages:

- 0% - Job started
- 10% - File validation
- 25% - AI service call
- 50% - AI response received
- 75% - Database updates
- 90% - Finalizing
- 100% - Complete

## Integration with Frontend

### 1. React Component Example

```javascript
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

function ParsingProgress({ candidateId, token }) {
  const [progress, setProgress] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const socket = io("http://localhost:3001", {
      auth: { token },
    });

    socket.on("parsing:progress", (data) => {
      if (data.candidateId === candidateId) {
        setProgress(data);
      }
    });

    socket.on("parsing:complete", (data) => {
      if (data.candidateId === candidateId) {
        setCompleted(true);
        setProgress(null);
      }
    });

    socket.on("parsing:failed", (data) => {
      if (data.candidateId === candidateId) {
        setError(data.error);
        setProgress(null);
      }
    });

    return () => socket.disconnect();
  }, [candidateId, token]);

  if (error) return <div className="error">Failed: {error}</div>;
  if (completed) return <div className="success">✅ Parsing Complete</div>;
  if (progress)
    return (
      <div className="progress">
        <div>{progress.message}</div>
        <div className="bar">
          <div style={{ width: `${progress.progress}%` }} />
        </div>
        <div>{progress.progress}%</div>
      </div>
    );
  return <div>Waiting to start...</div>;
}
```

### 2. Vue.js Component Example

```javascript
<template>
  <div>
    <div v-if="error" class="error">❌ {{ error }}</div>
    <div v-else-if="completed" class="success">✅ Parsing Complete</div>
    <div v-else-if="progress" class="progress">
      <div>{{ progress.message }}</div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{width: progress.progress + '%'}" />
      </div>
      <div>{{ progress.progress }}%</div>
    </div>
    <div v-else>Waiting to start...</div>
  </div>
</template>

<script>
import { io } from 'socket.io-client'

export default {
  props: ['candidateId', 'token'],
  data() {
    return {
      progress: null,
      completed: false,
      error: null,
      socket: null
    }
  },
  mounted() {
    this.socket = io('http://localhost:3001', {
      auth: { token: this.token }
    })

    this.socket.on('parsing:progress', (data) => {
      if (data.candidateId === this.candidateId) {
        this.progress = data
      }
    })

    this.socket.on('parsing:complete', (data) => {
      if (data.candidateId === this.candidateId) {
        this.completed = true
        this.progress = null
      }
    })

    this.socket.on('parsing:failed', (data) => {
      if (data.candidateId === this.candidateId) {
        this.error = data.error
        this.progress = null
      }
    })
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}
</script>
```

## Debugging

### 1. Enable Socket.io Debugging

```bash
DEBUG=socket.io:* npm start
```

### 2. Monitor Redis

```bash
# Connect to Redis CLI
redis-cli

# Monitor keys
MONITOR

# Check queue status
KEYS bull:resume-parsing:*
```

### 3. Check Browser Network Tab

Look for WebSocket connections and inspect frames being sent/received.

### 4. Server Logs

Monitor server logs for connection events:

```
🔌 User user-uuid connected via Socket.io
👤 User user-uuid joined room user:user-uuid
📊 Emitted parsing progress to user user-uuid: 25%
✅ Emitted parsing complete to user user-uuid for candidate candidate-uuid
```

## Production Considerations

### 1. Scaling with Redis Adapter

For multiple server instances:

```javascript
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({ url: "redis://localhost:6379" });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### 2. Load Balancing

Configure your load balancer to support WebSocket connections:

- Use sticky sessions
- Enable WebSocket upgrade
- Set proper timeout values

### 3. Monitoring

- Track connection counts
- Monitor message throughput
- Set up alerts for disconnections
- Log parsing performance metrics

This real-time system significantly improves user experience by providing instant feedback during resume parsing operations.
