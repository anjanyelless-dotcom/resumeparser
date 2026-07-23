import { Request, Response } from "express";
import { query } from "../database/db";

// Helper to ensure system_settings table exists
let isTableInitialized = false;

const ensureSettingsTable = async () => {
  if (isTableInitialized) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    isTableInitialized = true;
  } catch (error) {
    console.error("Failed to initialize system_settings table:", error);
    throw error;
  }
};

const DEFAULT_SETTINGS = {
  llm_provider: process.env.LLM_PROVIDER || "gemini",
  matching_threshold: 70,
  max_file_size_mb: parseInt(process.env.UPLOAD_MAX_SIZE_MB || "10"),
  auto_match: true,
  ocr_enabled: false,
};

export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureSettingsTable();

    const result = await query(
      "SELECT value FROM system_settings WHERE key = $1",
      ["system_config"]
    );

    if (result.rows.length === 0) {
      res.json({ settings: DEFAULT_SETTINGS });
      return;
    }

    res.json({ settings: result.rows[0].value });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to retrieve settings" });
  }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureSettingsTable();

    const { settings } = req.body;

    if (!settings) {
      res.status(400).json({ error: "Bad Request", message: "Settings object is required" });
      return;
    }

    const insertQuery = `
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      RETURNING value
    `;

    const result = await query(insertQuery, ["system_config", JSON.stringify(settings)]);

    res.json({
      message: "Settings saved successfully",
      settings: result.rows[0].value,
    });
  } catch (error) {
    console.error("Save settings error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to update settings" });
  }
};
