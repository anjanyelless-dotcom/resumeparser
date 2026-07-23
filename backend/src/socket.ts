import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";

// Extended socket interface with user properties
interface AuthenticatedSocket extends Socket {
  userId: string;
  email: string;
  role: string;
}

// Socket.io interface for real-time events
export interface ParsingProgressEvent {
  candidateId: string;
  progress: number;
  message: string;
}

export interface ParsingCompleteEvent {
  candidateId: string;
  data: any; // ParsedResume data
}

export interface ParsingFailedEvent {
  candidateId: string;
  error: string;
}

// JWT authentication middleware for Socket.io
const authenticateSocket = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void,
) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret",
    ) as any;

    // Attach user info to socket
    socket.userId = decoded.id;
    socket.email = decoded.email;
    socket.role = decoded.role;

    next();
  } catch (err) {
    next(new Error("Invalid or expired token"));
  }
};

// Create and configure Socket.io server
export const createSocketServer = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        ...(process.env.NODE_ENV === 'development' ? [
          "http://localhost:3000",
          "http://localhost:5173",
        ] : []),
        ...(process.env.ALLOWED_ORIGINS?.split(',') || [
          "https://lakshya-llm-resume-parser-ated.vercel.app",
        ]),
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Use authentication middleware
  io.use(authenticateSocket as any);

  // Handle connections
  io.on("connection", (socket: any) => {
    console.log(`🔌 User ${socket.userId} connected via Socket.io`);

    // Join user to their personal room (based on userId)
    socket.join(`user:${socket.userId}`);
    console.log(`👤 User ${socket.userId} joined room user:${socket.userId}`);

    // Handle joining candidate-specific rooms (for admins/managers)
    socket.on("join:candidate", (candidateId: string) => {
      socket.join(`candidate:${candidateId}`);
      console.log(
        `👤 User ${socket.userId} joined candidate room: ${candidateId}`,
      );
    });

    // Handle leaving candidate-specific rooms
    socket.on("leave:candidate", (candidateId: string) => {
      socket.leave(`candidate:${candidateId}`);
      console.log(
        `👤 User ${socket.userId} left candidate room: ${candidateId}`,
      );
    });

    // Handle disconnection
    socket.on("disconnect", (reason: any) => {
      console.log(`🔌 User ${socket.userId} disconnected: ${reason}`);
    });

    // Handle errors
    socket.on("error", (error: any) => {
      console.error(`❌ Socket error for user ${socket.userId}:`, error);
    });

    // Send welcome message
    socket.emit("connected", {
      message: "Connected to resume parser real-time updates",
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    });
  });

  // Global error handling
  io.on("error", (error) => {
    console.error("❌ Socket.io server error:", error);
  });

  console.log("🚀 Socket.io server initialized");
  return io;
};

// Export the io instance (will be set after server creation)
export let io: SocketIOServer | null = null;

// Function to set the io instance
export const setSocketInstance = (socketInstance: SocketIOServer) => {
  io = socketInstance;
};

// Helper functions to emit events
export const emitParsingProgress = (
  userId: string,
  data: ParsingProgressEvent,
) => {
  if (io) {
    io.to(`user:${userId}`).emit("parsing:progress", data);
    console.log(
      `📊 Emitted parsing progress to user ${userId}: ${data.progress}%`,
    );
  }
};

export const emitParsingComplete = (
  userId: string,
  data: ParsingCompleteEvent,
) => {
  if (io) {
    io.to(`user:${userId}`).emit("parsing:complete", data);
    console.log(
      `✅ Emitted parsing complete to user ${userId} for candidate ${data.candidateId}`,
    );
  }
};

export const emitParsingFailed = (userId: string, data: ParsingFailedEvent) => {
  if (io) {
    io.to(`user:${userId}`).emit("parsing:failed", data);
    console.log(
      `❌ Emitted parsing failed to user ${userId} for candidate ${data.candidateId}`,
    );
  }
};

// Admin/Manager functions - emit to candidate rooms
export const emitCandidateProgress = (
  candidateId: string,
  data: ParsingProgressEvent,
) => {
  if (io) {
    io.to(`candidate:${candidateId}`).emit("parsing:progress", data);
    console.log(
      `📊 Emitted candidate progress to candidate room ${candidateId}: ${data.progress}%`,
    );
  }
};

export const emitCandidateComplete = (
  candidateId: string,
  data: ParsingCompleteEvent,
) => {
  if (io) {
    io.to(`candidate:${candidateId}`).emit("parsing:complete", data);
    console.log(
      `✅ Emitted candidate complete to candidate room ${candidateId}`,
    );
  }
};

export const emitCandidateFailed = (
  candidateId: string,
  data: ParsingFailedEvent,
) => {
  if (io) {
    io.to(`candidate:${candidateId}`).emit("parsing:failed", data);
    console.log(`❌ Emitted candidate failed to candidate room ${candidateId}`);
  }
};

// Broadcast functions (for system-wide notifications)
export const broadcastSystemMessage = (
  message: string,
  type: "info" | "warning" | "error" = "info",
) => {
  if (io) {
    io.emit("system:message", {
      message,
      type,
      timestamp: new Date().toISOString(),
    });
    console.log(
      `📢 Broadcast system message: [${type.toUpperCase()}] ${message}`,
    );
  }
};

export default createSocketServer;
