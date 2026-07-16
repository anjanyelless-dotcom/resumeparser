# Socket.io Client Integration Guide

## Overview

The backend now provides real-time parsing progress updates via Socket.io. Clients can connect to receive live updates when resume parsing jobs are processed.

## Connection Setup

### 1. Install Socket.io Client

```bash
npm install socket.io-client
```

### 2. Connect to Server

```javascript
import { io } from "socket.io-client";

// Get JWT token from authentication
const token = localStorage.getItem("jwtToken") || getJwtToken();

// Connect to Socket.io server
const socket = io("http://localhost:3001", {
  auth: {
    token: token, // Send JWT token for authentication
  },
  transports: ["websocket", "polling"],
});

// Handle connection
socket.on("connect", () => {
  console.log("Connected to real-time updates:", socket.id);
});

// Handle connection errors
socket.on("connect_error", (error) => {
  console.error("Connection failed:", error.message);
});
```

## Real-time Events

### 1. Parsing Progress Updates

```javascript
socket.on("parsing:progress", (data) => {
  console.log("Parsing progress:", data);
  // data: { candidateId, progress: 0-100, message: string }

  // Update UI progress bar
  updateProgressBar(data.candidateId, data.progress);

  // Show status message
  showStatusMessage(data.message);

  // Example UI update:
  const progressBar = document.getElementById(`progress-${data.candidateId}`);
  if (progressBar) {
    progressBar.style.width = `${data.progress}%`;
    progressBar.textContent = `${data.progress}% - ${data.message}`;
  }
});
```

### 2. Parsing Completion

```javascript
socket.on("parsing:complete", (data) => {
  console.log("Parsing completed:", data);
  // data: { candidateId, data: ParsedResume }

  // Show success notification
  showSuccessNotification(
    `Resume parsing completed for candidate ${data.candidateId}`,
  );

  // Update candidate data in UI
  updateCandidateProfile(data.candidateId, data.data);

  // Navigate to candidate details
  // window.location.href = `/candidates/${data.candidateId}`
});
```

### 3. Parsing Failure

```javascript
socket.on("parsing:failed", (data) => {
  console.error("Parsing failed:", data);
  // data: { candidateId, error: string }

  // Show error notification
  showErrorNotification(`Parsing failed: ${data.error}`);

  // Update UI to show failed status
  markParsingAsFailed(data.candidateId, data.error);
});
```

### 4. System Messages

```javascript
socket.on("system:message", (data) => {
  console.log("System message:", data);
  // data: { message, type: 'info' | 'warning' | 'error', timestamp }

  // Show system-wide notifications
  showSystemNotification(data.message, data.type);
});
```

## Advanced Features

### Join Candidate Rooms (Admin/Manager)

```javascript
// Join a specific candidate's room to monitor their parsing
socket.emit("join:candidate", candidateId);

// Leave candidate room
socket.emit("leave:candidate", candidateId);
```

### React Hook Example

```javascript
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export const useParsingSocket = (token) => {
  const [socket, setSocket] = useState(null);
  const [progress, setProgress] = useState({});
  const [completed, setCompleted] = useState([]);
  const [failed, setFailed] = useState([]);

  useEffect(() => {
    const socketInstance = io("http://localhost:3001", {
      auth: { token },
    });

    socketInstance.on("parsing:progress", (data) => {
      setProgress((prev) => ({
        ...prev,
        [data.candidateId]: data,
      }));
    });

    socketInstance.on("parsing:complete", (data) => {
      setCompleted((prev) => [...prev, data]);
      setProgress((prev) => {
        const { [data.candidateId]: removed, ...rest } = prev;
        return rest;
      });
    });

    socketInstance.on("parsing:failed", (data) => {
      setFailed((prev) => [...prev, data]);
      setProgress((prev) => {
        const { [data.candidateId]: removed, ...rest } = prev;
        return rest;
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  return { socket, progress, completed, failed };
};
```

### Vue.js Composable Example

```javascript
import { ref, onMounted, onUnmounted } from "vue";
import { io } from "socket.io-client";

export function useParsingSocket(token) {
  const socket = ref(null);
  const progress = ref({});
  const completed = ref([]);
  const failed = ref([]);

  const connect = () => {
    socket.value = io("http://localhost:3001", {
      auth: { token },
    });

    socket.value.on("parsing:progress", (data) => {
      progress.value[data.candidateId] = data;
    });

    socket.value.on("parsing:complete", (data) => {
      completed.value.push(data);
      delete progress.value[data.candidateId];
    });

    socket.value.on("parsing:failed", (data) => {
      failed.value.push(data);
      delete progress.value[data.candidateId];
    });
  };

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect();
    }
  };

  onMounted(connect);
  onUnmounted(disconnect);

  return {
    socket,
    progress,
    completed,
    failed,
  };
}
```

## UI Component Examples

### Progress Bar Component

```javascript
function ParsingProgressBar({ candidateId, progress }) {
  if (!progress) return null;

  return (
    <div className="parsing-progress">
      <div className="progress-header">
        <span>Parsing Resume...</span>
        <span>{progress.progress}%</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress.progress}%` }}
        />
      </div>
      <div className="progress-message">{progress.message}</div>
    </div>
  );
}
```

### Status Badge Component

```javascript
function ParsingStatus({ candidateId, progress, completed, failed }) {
  const isCompleted = completed.some((c) => c.candidateId === candidateId);
  const isFailed = failed.some((f) => f.candidateId === candidateId);
  const inProgress = progress[candidateId];

  if (isCompleted) {
    return <span className="badge badge-success">✅ Parsed</span>;
  }

  if (isFailed) {
    const failedItem = failed.find((f) => f.candidateId === candidateId);
    return (
      <span className="badge badge-danger" title={failedItem.error}>
        ❌ Failed
      </span>
    );
  }

  if (inProgress) {
    return (
      <span className="badge badge-warning">
        🔄 Parsing ({inProgress.progress}%)
      </span>
    );
  }

  return <span className="badge badge-secondary">⏸️ Pending</span>;
}
```

## Error Handling

### Connection Errors

```javascript
socket.on("connect_error", (error) => {
  if (error.message === "Authentication token required") {
    // Redirect to login
    window.location.href = "/login";
  } else if (error.message === "Invalid or expired token") {
    // Refresh token or re-authenticate
    refreshToken();
  } else {
    // Show connection error
    showConnectionError(error.message);
  }
});
```

### Reconnection Logic

```javascript
socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);

  if (reason === "io server disconnect") {
    // Server disconnected, reconnect manually
    socket.connect();
  }

  // Show offline indicator
  showOfflineStatus();
});

socket.on("connect", () => {
  // Hide offline indicator
  hideOfflineStatus();

  // Refresh current data
  refreshCurrentData();
});
```

## Testing

### Mock Socket.io for Testing

```javascript
// For unit tests, you can mock the socket
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock("socket.io-client", () => ({
  io: jest.fn(() => mockSocket),
}));
```

### Manual Testing

1. Open browser developer tools
2. Connect to Socket.io with valid JWT token
3. Create a candidate with a resume file
4. Monitor console for real-time events
5. Verify progress updates and completion events

## Production Considerations

### Security

- Always use HTTPS in production
- Validate JWT tokens properly
- Implement rate limiting for Socket.io connections
- Use room-based access control for sensitive data

### Performance

- Limit the number of concurrent connections
- Use connection pooling for Redis
- Implement proper cleanup on component unmount
- Consider using WebSocket compression

### Scalability

- Use Redis adapter for multi-server Socket.io deployments
- Implement horizontal scaling with load balancers
- Monitor connection counts and memory usage
- Use clustering for high-traffic applications

This real-time system provides instant feedback to users during resume parsing, significantly improving the user experience.
