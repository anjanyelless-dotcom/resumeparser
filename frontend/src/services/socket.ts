import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore";
import { useCandidateStore } from "../store/useCandidateStore";
import { useJobStore } from "../store/useJobStore";

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Connect to socket server
  connectSocket(userId?: string) {
    if (this.socket?.connected) {
      return;
    }

    const token = useAuthStore.getState().token;
    const serverUrl = import.meta.env.VITE_SOCKET_URL;

    this.socket = io(serverUrl, {
      auth: {
        token,
        userId,
      },
      transports: ["websocket", "polling"],
      timeout: 10000,
    });

    this.setupEventListeners();
  }

  // Disconnect socket
  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Setup event listeners
  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Socket connected");
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);

      if (reason === "io server disconnect") {
        // Server disconnected, reconnect manually
        this.handleReconnect();
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.handleReconnect();
    });

    // Parsing progress event
    this.socket.on(
      "parsing:progress",
      (data: { candidateId: string; progress: number; message: string }) => {
        console.log("Parsing progress:", data);

        // Update candidate store with progress
        const candidateStore = useCandidateStore.getState();
        candidateStore.updateCandidateStatus(data.candidateId, {
          status: "processing",
          progress: data.progress,
        });
      },
    );

    // Parsing complete event
    this.socket.on(
      "parsing:complete",
      (data: { candidateId: string; data: any }) => {
        console.log("Parsing complete:", data);

        // Update candidate store with completion
        const candidateStore = useCandidateStore.getState();
        candidateStore.updateCandidateStatus(data.candidateId, {
          status: "completed",
          progress: 100,
          confidence_score: data.data.confidence?.overall,
        });

        // Refresh candidate data if it's the current candidate
        if (candidateStore.currentCandidate?.id === data.candidateId) {
          candidateStore.fetchCandidate(data.candidateId);
        }
      },
    );

    // Parsing failed event
    this.socket.on(
      "parsing:failed",
      (data: { candidateId: string; error: string }) => {
        console.error("Parsing failed:", data);

        // Update candidate store with error
        const candidateStore = useCandidateStore.getState();
        candidateStore.updateCandidateStatus(data.candidateId, {
          status: "failed",
          error_message: data.error,
        });
      },
    );

    // Matching progress event
    this.socket.on(
      "matching:progress",
      (data: { jobId: string; progress: number; message: string }) => {
        console.log("Matching progress:", data);

        // Update job store with progress
        const jobStore = useJobStore.getState();
        jobStore.setMatchingProgress(data.progress);
      },
    );

    // Matching complete event
    this.socket.on(
      "matching:complete",
      (data: { jobId: string; results: any[] }) => {
        console.log("Matching complete:", data);

        // Update job store with results
        const jobStore = useJobStore.getState();
        jobStore.setMatchingProgress(100);
        jobStore.fetchMatchResults(data.jobId);
      },
    );
  }

  // Handle reconnection logic
  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      );

      setTimeout(() => {
        const userId = useAuthStore.getState().user?.id;
        this.connectSocket(userId);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  // Subscribe to parsing progress
  subscribeToParsingProgress(
    callback: (data: {
      candidateId: string;
      progress: number;
      message: string;
    }) => void,
  ) {
    if (this.socket) {
      this.socket.on("parsing:progress", callback);
    }
  }

  // Subscribe to parsing complete
  subscribeToParsingComplete(
    callback: (data: { candidateId: string; data: any }) => void,
  ) {
    if (this.socket) {
      this.socket.on("parsing:complete", callback);
    }
  }

  // Subscribe to parsing failed
  subscribeToParsingFailed(
    callback: (data: { candidateId: string; error: string }) => void,
  ) {
    if (this.socket) {
      this.socket.on("parsing:failed", callback);
    }
  }

  // Subscribe to matching progress
  subscribeToMatchingProgress(
    callback: (data: {
      jobId: string;
      progress: number;
      message: string;
    }) => void,
  ) {
    if (this.socket) {
      this.socket.on("matching:progress", callback);
    }
  }

  // Subscribe to matching complete
  subscribeToMatchingComplete(
    callback: (data: { jobId: string; results: any[] }) => void,
  ) {
    if (this.socket) {
      this.socket.on("matching:complete", callback);
    }
  }

  // Unsubscribe from events
  unsubscribe(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Join a room (for real-time updates)
  joinRoom(room: string) {
    if (this.socket) {
      this.socket.emit("join-room", room);
    }
  }

  // Leave a room
  leaveRoom(room: string) {
    if (this.socket) {
      this.socket.emit("leave-room", room);
    }
  }

  // Get socket connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket instance
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Create singleton instance
export const socketService = new SocketService();

// Export convenience functions
export const connectSocket = (userId?: string) =>
  socketService.connectSocket(userId);
export const disconnectSocket = () => socketService.disconnectSocket();
export const subscribeToParsingProgress = (
  callback: (data: {
    candidateId: string;
    progress: number;
    message: string;
  }) => void,
) => socketService.subscribeToParsingProgress(callback);
export const subscribeToParsingComplete = (
  callback: (data: { candidateId: string; data: any }) => void,
) => socketService.subscribeToParsingComplete(callback);
export const subscribeToParsingFailed = (
  callback: (data: { candidateId: string; error: string }) => void,
) => socketService.subscribeToParsingFailed(callback);
export const subscribeToMatchingProgress = (
  callback: (data: {
    jobId: string;
    progress: number;
    message: string;
  }) => void,
) => socketService.subscribeToMatchingProgress(callback);
export const subscribeToMatchingComplete = (
  callback: (data: { jobId: string; results: any[] }) => void,
) => socketService.subscribeToMatchingComplete(callback);

export default socketService;
