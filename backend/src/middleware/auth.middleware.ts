import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

type AuthRequest = AuthenticatedRequest;

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "fallback-secret",
    (err, decoded) => {
      if (err) {
        res.status(403).json({ error: "Invalid or expired token" });
        return;
      }

      req.user = {
        id: (decoded as any).id,
        email: (decoded as any).email,
        role: (decoded as any).role,
      };
      next();
    },
  );
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
};
