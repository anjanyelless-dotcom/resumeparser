import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { query } from "../database/db";
import { v4 as uuidv4 } from "uuid";
import { isValidRole, getDefaultRole, VALID_ROLES } from "../constants/roles";

interface RegisterRequest {
  email: string;
  password: string;
  role?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

export const registerUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, password, role = getDefaultRole() }: RegisterRequest = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Validate role
    if (!isValidRole(role)) {
      res.status(400).json({ 
        error: "Invalid role",
        details: `Role must be one of: ${VALID_ROLES.join(', ')}`
      });
      return;
    }

    // Check if user already exists
    const existingUser = await query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: "User with this email already exists" });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const id = uuidv4();
    const result = await query(
      `INSERT INTO users (id, email, hashed_password, role, is_active, tenant_id, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, email, role, created_at`,
      [id, email, passwordHash, role, true, "default", new Date()],
    );

    const user = result.rows[0];

    // Generate JWT token with role information
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "24h" },
    );

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
      token,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error", details: error?.message || String(error) });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Find user with role information
    const result = await query(
      `SELECT u.id, u.email, u.hashed_password, u.role, u.created_at
       FROM users u 
       WHERE u.email = $1`,
      [email],
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.hashed_password,
    );

    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Generate JWT token with role information
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "24h" },
    );

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.email.split('@')[0], // Generate name from email
        role: user.role,
        created_at: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMe = async (
  req: Request & { user?: any },
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const result = await query(
      "SELECT id, email, role, created_at FROM users WHERE id = $1",
      [req.user.id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
