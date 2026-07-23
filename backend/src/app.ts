import express, { Application, Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import candidateRoutes from "./routes/candidate.routes";
import jobRoutes from "./routes/job.routes";
import uploadRoutes from "./routes/upload.routes";
import resumeRoutes from "./routes/resume.routes";
import matchingRoutes from "./routes/matching.routes";
import labelingRoutes from "./routes/labeling.routes";
import settingsRoutes from "./routes/settings.routes";
import analyticsRoutes from "./routes/analytics.routes";
import permissionsRoutes from "./routes/permissions.routes";
import clientRoutes from "./routes/client.routes";
import auditRoutes from "./routes/audit.routes";
import submissionRoutes from "./routes/submission.routes";

import interviewRoutes from "./routes/interview.routes";
import offerRoutes from "./routes/offer.routes";
import joiningRoutes from "./routes/joining.routes";
import placementRoutes from "./routes/placement.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import activityRoutes from "./routes/activity.routes";
import userRoutes from "./routes/user.routes";
import teamRoutes from "./routes/team.routes";
import communicationRoutes from "./routes/communication.routes";
import companyRoutes from "./routes/company.routes";
import skillsRoutes from "./routes/skills.routes";
import rolesRoutes from "./routes/roles.routes";
import rbacRoutes from "./routes/rbac.routes";
import { getMyAssignments } from "./controllers/job.controller";
import { authenticateToken, requirePermission } from "./middleware/auth.middleware";

const app: Application = express();
 
// CORS configuration
const corsOptions = {
  origin: [
    ...(process.env.NODE_ENV === 'development' ? [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
    ] : []),
    ...(process.env.ALLOWED_ORIGINS?.split(',') || [
      "https://lakshya-llm-resume-parser.vercel.app",
      "https://anjanyelle-lakshyaresumeparsers11.vercel.app",
      "https://lakshya-resume-parsers.vercel.app",
    ]),
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(process.cwd(), process.env.FILE_UPLOAD_PATH || "uploads")));

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/matching", matchingRoutes);
app.use("/api/labeling", labelingRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/accuracy", analyticsRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/submissions", submissionRoutes);

app.use("/api/interviews", interviewRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/joining", joiningRoutes);
app.use("/api/placements", placementRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/users", userRoutes);
app.use("/api/team-lead", teamRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/communications", communicationRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/admin/rbac", rbacRoutes);

// Recruiter requirements route (alias for my-assignments)
app.get("/api/recruiter/requirements", authenticateToken, requirePermission("requirements", "view"), getMyAssignments);

// 404 handler
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Token expired",
    });
  }

  // Database errors
  if (err.message.includes("duplicate key")) {
    return res.status(409).json({
      error: "Resource already exists",
    });
  }

  // Default error
  return res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

export default app;
