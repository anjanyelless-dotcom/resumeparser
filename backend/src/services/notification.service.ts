import { io } from "../socket";

export interface NotificationPayload {
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  link?: string;
  data?: any;
}

export const notifyUser = (userId: string, payload: NotificationPayload) => {
  if (io) {
    io.to(`user:${userId}`).emit("notification", {
      ...payload,
      timestamp: new Date().toISOString()
    });
    console.log(`🔔 Emitted notification to user ${userId}: ${payload.title}`);
  } else {
    console.warn(`⚠️ Could not emit notification to user ${userId}: Socket.io not initialized`);
  }
};
