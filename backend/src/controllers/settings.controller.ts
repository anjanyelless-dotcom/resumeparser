import { Request, Response } from "express";
import { query, getClient } from "../database/db";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

// Helper to ensure system_settings table exists
let isTableInitialized = false;

const ensureSettingsTable = async () => {
  if (isTableInitialized) return;
  try {
    // Check if table already exists to avoid permission errors on CREATE
    // when the user does not have CREATE privilege on the public schema.
    const result = await query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'system_settings'
      )`
    );
    if (!result.rows[0].exists) {
      await query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key VARCHAR(100) PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
    }
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
  pipeline_stages: [
    { name: "Submitted", order: 1, isActive: true },
    { name: "Under Review", order: 2, isActive: true },
    { name: "Shortlisted", order: 3, isActive: true },
    { name: "Interview Scheduled", order: 4, isActive: true },
    { name: "Interview Completed", order: 5, isActive: true },
    { name: "Offer Extended", order: 6, isActive: true },
    { name: "Offer Accepted", order: 7, isActive: true },
    { name: "Rejected", order: 8, isActive: true },
    { name: "On Hold", order: 9, isActive: true },
  ],
  email_templates: {
    "Interview Invitation": {
      subject: "Interview Invitation - {{candidate_name}} for {{job_title}}",
      body: "Dear {{candidate_name}},\n\nWe're pleased to invite you for an interview for the {{job_title}} position at {{company_name}}.\n\nInterview Details:\nDate: {{interview_date}}\nTime: {{interview_time}}\nLocation: {{interview_location}}\n\nPlease confirm your attendance.\n\nBest regards,\n{{recruiter_name}}"
    },
    "Offer Letter": {
      subject: "Job Offer - {{job_title}} at {{company_name}}",
      body: "Dear {{candidate_name}},\n\nWe're delighted to offer you the position of {{job_title}} at {{company_name}}.\n\nOffer Details:\nPosition: {{job_title}}\nSalary: {{salary}}\nStart Date: {{start_date}}\nLocation: {{location}}\n\nPlease review and sign the offer letter.\n\nCongratulations!\n{{recruiter_name}}"
    },
    "Rejection Notice": {
      subject: "Update on your application for {{job_title}}",
      body: "Dear {{candidate_name}},\n\nThank you for your interest in the {{job_title}} position at {{company_name}}.\n\nAfter careful consideration, we've decided to move forward with other candidates whose qualifications more closely match our current needs.\n\nWe appreciate your time and wish you success in your job search.\n\nBest regards,\n{{recruiter_name}}"
    },
    "Submission Acknowledgement": {
      subject: "Application Received - {{job_title}}",
      body: "Dear {{candidate_name}},\n\nThank you for submitting your application for the {{job_title}} position at {{company_name}}.\n\nWe've received your application and our team will review it carefully. We'll contact you within {{response_time}} if your profile matches our requirements.\n\nApplication Details:\nPosition: {{job_title}}\nSubmitted: {{submission_date}}\nApplication ID: {{application_id}}\n\nBest regards,\n{{company_name}} Team"
    }
  },
  notification_settings: [
    {
      eventName: "candidate_submitted",
      isEnabled: true,
      notifyRoles: ["admin", "manager", "recruiter"]
    },
    {
      eventName: "candidate_shortlisted",
      isEnabled: true,
      notifyRoles: ["admin", "manager", "recruiter"]
    },
    {
      eventName: "interview_scheduled",
      isEnabled: true,
      notifyRoles: ["admin", "manager", "recruiter", "candidate"]
    },
    {
      eventName: "offer_extended",
      isEnabled: true,
      notifyRoles: ["admin", "manager", "recruiter"]
    },
    {
      eventName: "candidate_rejected",
      isEnabled: true,
      notifyRoles: ["admin", "manager", "recruiter"]
    }
  ]
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

// Helper function to write audit logs
const writeSettingsAuditLog = async (
  userId: string,
  action: string,
  details: any = null,
  ipAddress?: string
) => {
  const client = await getClient();
  try {
    await client.query(
      `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, ip_address, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        crypto.randomUUID(),
        userId,
        action,
        "settings",
        "system_config",
        ipAddress,
        JSON.stringify(details),
      ]
    );
  } catch (error) {
    console.error("Failed to write audit log:", error);
  } finally {
    client.release();
  }
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    // Write audit log
    await writeSettingsAuditLog(
      req.user!.id,
      "UPDATE_SETTINGS",
      {
        updated_keys: Object.keys(settings),
        settings_snapshot: settings,
      },
      req.ip
    );

    res.json({
      message: "Settings saved successfully",
      settings: result.rows[0].value,
    });
  } catch (error) {
    console.error("Save settings error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to update settings" });
  }
};
