import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { getClient } from "../database/db";
import { JobModel, JobDescription, JobFilter } from "../models/job.model";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import crypto from "crypto";

// Helper function to write audit logs
const writeAuditLog = async (
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
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
        resourceType,
        resourceId,
        ipAddress || 'unknown',
        JSON.stringify(details),
      ]
    );
  } catch (error) {
    console.error("Failed to write audit log:", error);
  } finally {
    client.release();
  }
};

// Validation rules
export const createJobValidation = [
  body("title")
    .isLength({ min: 3, max: 255 })
    .withMessage("Title must be between 3 and 255 characters")
    .trim(),
  body("description")
    .isLength({ min: 50 })
    .withMessage("Description must be at least 50 characters long")
    .trim(),
  body("required_skills")
    .isArray({ min: 1 })
    .withMessage("Required skills must be a non-empty array"),
  body("required_skills.*")
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage("Each skill must be between 1 and 100 characters"),
  body("department")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Department must be between 1 and 100 characters")
    .trim(),
  body("location")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Location must be between 1 and 100 characters")
    .trim(),
  // Enhanced location fields
  body("country")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Country must be between 1 and 100 characters")
    .trim(),
  body("state")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("State must be between 1 and 100 characters")
    .trim(),
  body("city")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("City must be between 1 and 100 characters")
    .trim(),
  body("pincode")
    .optional()
    .isLength({ min: 5, max: 10 })
    .withMessage("PIN code must be between 5 and 10 characters")
    .trim()
    .matches(/^\d+$/)
    .withMessage("PIN code must contain only digits"),
  body("latitude")
    .optional()
    .isString()
    .matches(/^-?\d+\.?\d*$/)
    .withMessage("Latitude must be a valid number"),
  body("longitude")
    .optional()
    .isString()
    .matches(/^-?\d+\.?\d*$/)
    .withMessage("Longitude must be a valid number"),
  body("location_source")
    .optional()
    .isIn(["manual", "pincode", "geolocation"])
    .withMessage("Location source must be one of: manual, pincode, geolocation"),
  body("employment_type")
    .optional()
    .isIn(["full-time", "part-time", "contract", "internship", "temporary"])
    .withMessage(
      "Employment type must be one of: full-time, part-time, contract, internship, temporary",
    ),
  body("min_experience_years")
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage("Minimum experience must be between 0 and 50 years"),
  body("max_experience_years")
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage("Maximum experience must be between 0 and 50 years"),
  body("education_level")
    .optional()
    .isIn(["high-school", "bachelor", "master", "phd", "any"])
    .withMessage(
      "Education level must be one of: high-school, bachelor, master, phd, any",
    ),
  body("salary_min")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Minimum salary must be a positive integer"),
  body("salary_max")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Maximum salary must be a positive integer")
    .custom((value: number, { req }: { req: any }) => {
      if (
        req.body.salary_min !== undefined &&
        value !== undefined &&
        req.body.salary_min > value
      ) {
        throw new Error("Minimum salary cannot be greater than maximum salary");
      }
      return true;
    }),
  body("client_id")
    .optional()
    .isUUID()
    .withMessage("Client ID must be a valid UUID"),
];

export const clarifyJobValidation = [
  body("description")
    .optional()
    .isLength({ min: 50 })
    .withMessage("Description must be at least 50 characters long")
    .trim(),
  body("required_skills")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Required skills must be a non-empty array"),
  body("required_skills.*")
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage("Each skill must be between 1 and 100 characters"),
  body("location")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Location must be between 1 and 100 characters")
    .trim(),
  // Enhanced location fields
  body("country")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Country must be between 1 and 100 characters")
    .trim(),
  body("state")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("State must be between 1 and 100 characters")
    .trim(),
  body("city")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("City must be between 1 and 100 characters")
    .trim(),
  body("pincode")
    .optional()
    .isLength({ min: 5, max: 10 })
    .withMessage("PIN code must be between 5 and 10 characters")
    .trim()
    .matches(/^\d+$/)
    .withMessage("PIN code must contain only digits"),
  body("latitude")
    .optional()
    .isString()
    .matches(/^-?\d+\.?\d*$/)
    .withMessage("Latitude must be a valid number"),
  body("longitude")
    .optional()
    .isString()
    .matches(/^-?\d+\.?\d*$/)
    .withMessage("Longitude must be a valid number"),
  body("location_source")
    .optional()
    .isIn(["manual", "pincode", "geolocation"])
    .withMessage("Location source must be one of: manual, pincode, geolocation"),
  body("min_experience_years")
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage("Minimum experience must be between 0 and 50 years"),
  body("max_experience_years")
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage("Maximum experience must be between 0 and 50 years"),
  body("education_level")
    .optional()
    .isIn(["any", "high_school", "associate", "bachelor", "master", "phd"])
    .withMessage("Education level must be one of: any, high_school, associate, bachelor, master, phd"),
  body("salary_min")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum salary must be a positive number"),
  body("salary_max")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum salary must be a positive number"),
];

export const updateJobValidation = [
  body("title")
    .optional()
    .isLength({ min: 3, max: 255 })
    .withMessage("Title must be between 3 and 255 characters")
    .trim(),
  body("description")
    .optional()
    .isLength({ min: 50 })
    .withMessage("Description must be at least 50 characters long")
    .trim(),
  body("required_skills")
    .optional()
    .isArray()
    .withMessage("Required skills must be an array"),
  body("required_skills.*")
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage("Each skill must be between 1 and 100 characters"),
  body("department")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Department must be between 1 and 100 characters")
    .trim(),
  body("location")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Location must be between 1 and 100 characters")
    .trim(),
  // Enhanced location fields
  body("country")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Country must be between 1 and 100 characters")
    .trim(),
  body("state")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("State must be between 1 and 100 characters")
    .trim(),
  body("city")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("City must be between 1 and 100 characters")
    .trim(),
  body("pincode")
    .optional()
    .isLength({ min: 5, max: 10 })
    .withMessage("PIN code must be between 5 and 10 characters")
    .trim()
    .matches(/^\d+$/)
    .withMessage("PIN code must contain only digits"),
  body("latitude")
    .optional()
    .isString()
    .matches(/^-?\d+\.?\d*$/)
    .withMessage("Latitude must be a valid number"),
  body("longitude")
    .optional()
    .isString()
    .matches(/^-?\d+\.?\d*$/)
    .withMessage("Longitude must be a valid number"),
  body("location_source")
    .optional()
    .isIn(["manual", "pincode", "geolocation"])
    .withMessage("Location source must be one of: manual, pincode, geolocation"),
  body("employment_type")
    .optional()
    .isIn(["full-time", "part-time", "contract", "internship", "temporary"])
    .withMessage(
      "Employment type must be one of: full-time, part-time, contract, internship, temporary",
    ),
  body("min_experience_years")
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage("Minimum experience must be between 0 and 50 years"),
  body("max_experience_years")
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage("Maximum experience must be between 0 and 50 years"),
  body("salary_min")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Minimum salary must be a positive integer"),
  body("salary_max")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Maximum salary must be a positive integer")
    .custom((value: number, { req }: { req: any }) => {
      if (
        req.body.salary_min !== undefined &&
        value !== undefined &&
        req.body.salary_min > value
      ) {
        throw new Error("Minimum salary cannot be greater than maximum salary");
      }
      return true;
    }),
];

// Controller functions
export const createJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: "Validation failed",
        details: errors.array().map((err: any) => err.msg),
      });
      return;
    }

    const jobData: Partial<JobDescription> = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const client = await getClient();
    try {
      const job = await JobModel.create(client, jobData, userId);

      // Write audit log
      if (job.id) {
        await writeAuditLog(
          userId,
          "CREATE_JOB",
          "job_descriptions",
          job.id,
          { title: job.title, client_id: job.client_id, created_by_user_id: userId },
          req.ip
        );
      }

      res.status(201).json({
        message: "Job created successfully",
        job,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Create job error:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
};

export const getAllJobs = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const adminView = req.query.adminView === "true";

  try {
    // If adminView is requested, check for proper permission
    if (adminView) {
      // This will be handled by middleware, but we double-check here
      if (!req.user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
    }

    console.log("=== GET ALL JOBS START ===");
    console.log("Request parameters:", {
      page,
      limit,
      adminView,
      user: req.user?.id,
      role: req.user?.role,
      query: req.query
    });

    const filters: JobFilter = {
      search: (req.query.search as string) || undefined,
      department: (req.query.department as string) || undefined,
      location: (req.query.location as string) || undefined,
      employment_type: (req.query.employment_type as string) || undefined,
      min_experience: req.query.min_experience
        ? parseInt(req.query.min_experience as string)
        : undefined,
      max_experience: req.query.max_experience
        ? parseInt(req.query.max_experience as string)
        : undefined,
      created_by_user_id: (req.query.created_by_user_id as string) || undefined,
    };

    console.log("Filters:", filters);

    const client = await getClient();
    try {
      if (adminView) {
        // Admin view: get all jobs across all owners with client info and days_open
        const whereConditions = [];
        const queryParams: any[] = [];
        let paramIndex = 1;

        if (filters.search) {
          whereConditions.push(`(j.title ILIKE $${paramIndex} OR j.description ILIKE $${paramIndex})`);
          queryParams.push(`%${filters.search}%`);
          paramIndex++;
        }

        if (filters.department) {
          whereConditions.push(`j.department = $${paramIndex}`);
          queryParams.push(filters.department);
          paramIndex++;
        }

        if (filters.location) {
          whereConditions.push(`j.location = $${paramIndex}`);
          queryParams.push(filters.location);
          paramIndex++;
        }

        if (filters.employment_type) {
          whereConditions.push(`j.employment_type = $${paramIndex}`);
          queryParams.push(filters.employment_type);
          paramIndex++;
        }

        if (filters.min_experience !== undefined) {
          whereConditions.push(`(j.min_experience_years IS NULL OR j.min_experience_years >= $${paramIndex})`);
          queryParams.push(filters.min_experience);
          paramIndex++;
        }

        if (filters.max_experience !== undefined) {
          whereConditions.push(`(j.max_experience_years IS NULL OR j.max_experience_years <= $${paramIndex})`);
          queryParams.push(filters.max_experience);
          paramIndex++;
        }

        if (filters.created_by_user_id) {
          whereConditions.push(`j.created_by_user_id = $${paramIndex}`);
          queryParams.push(filters.created_by_user_id);
          paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get total count
        const countQuery = `
          SELECT COUNT(*) as total 
          FROM job_descriptions j 
          ${whereClause}
        `;
        const countResult = await client.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Get paginated results with admin data
        const offset = (page - 1) * limit;
        const dataQuery = `
          SELECT 
            j.id, j.title, j.description, j.department, j.location, 
            j.employment_type, j.min_experience_years, j.max_experience_years,
            j.salary_min, j.salary_max, j.status,
            j.created_at, j.updated_at,
            EXTRACT(DAYS FROM (NOW() - j.created_at)) as days_open
          FROM job_descriptions j
          ${whereClause}
          ORDER BY j.created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        queryParams.push(limit, offset);

        const result = await client.query(dataQuery, queryParams);

        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.json({
          jobs: result.rows,
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_items: total,
            items_per_page: limit,
            has_next_page: hasNextPage,
            has_prev_page: hasPrevPage,
          },
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          adminView: true,
        });
      } else {
        // Regular view: use existing JobModel.findAll
        // Add client_manager scoping
        let clientManagerUserId: string | undefined;
        if (req.user && req.user.role === 'client_manager') {
          clientManagerUserId = req.user.id;
        }

        const { jobs, total } = await JobModel.findAll(
          client,
          page,
          limit,
          filters,
          clientManagerUserId,
        );

        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.json({
          jobs,
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_items: total,
            items_per_page: limit,
            has_next_page: hasNextPage,
            has_prev_page: hasPrevPage,
          },
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          adminView: false,
        });
      }
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Get all jobs error:", error.message);
    console.error("Error details:", {
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      column: error.column,
      table: error.table,
      routine: error.routine,
      stack: error.stack
    });
    console.error("Request parameters:", {
      page,
      limit,
      adminView
    });
    res.status(500).json({ 
      error: error.message || "Internal server error",
      detail: error.detail,
      code: error.code
    });
  }
};

export const getJobById = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const jobId = Array.isArray(id) ? id[0] : id;

    if (!jobId) {
      res.status(400).json({ error: "Job ID is required" });
      return;
    }

    const client = await getClient();
    try {
      const job = await JobModel.findById(client, jobId);

      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      // Note: Client-based scoping removed since jobs table doesn't have client_id column
      // When client_id is added to jobs table, implement proper client_manager scoping here

      res.json({ job });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get job by ID error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const clarifyJob = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const jobId = Array.isArray(id) ? id[0] : id;
    const updates: Partial<JobDescription> = req.body;

    if (!jobId) {
      res.status(400).json({ error: "Job ID is required" });
      return;
    }

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: "Validation failed",
        details: errors.array().map((err: any) => err.msg),
      });
      return;
    }

    // Only allow specific fields to be updated by client_manager
    const allowedFields = [
      'description',
      'required_skills',
      'location',
      'min_experience_years',
      'max_experience_years',
      'education_level',
      'salary_min',
      'salary_max'
    ];

    // Filter out any fields that are not allowed
    const filteredUpdates: Partial<JobDescription> = {};
    for (const field of allowedFields) {
      if (updates[field as keyof JobDescription] !== undefined) {
        (filteredUpdates as any)[field] = updates[field as keyof JobDescription];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const client = await getClient();
    try {
      // Check if job exists and belongs to user's clients
      const jobCheck = await client.query(
        `SELECT j.id, j.client_id, c.owner_user_id 
         FROM job_descriptions j 
         JOIN clients c ON j.client_id = c.id 
         WHERE j.id = $1`,
        [jobId]
      );

      if (jobCheck.rows.length === 0) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      const job = jobCheck.rows[0];

      // Validate that the job's client belongs to the user
      if (!req.user || job.owner_user_id !== req.user.id) {
        res.status(403).json({ 
          error: "Forbidden - You can only clarify requirements for your own clients" 
        });
        return;
      }

      // Build the update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(filteredUpdates)) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }

      // Add updated_at
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(jobId);

      const updateQuery = `
        UPDATE job_descriptions 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, updateValues);
      const updatedJob = result.rows[0];

      // Log audit trail
      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [crypto.randomUUID(), req.user?.id || '', 'CLARIFY_REQUIREMENT', 'job_descriptions', jobId, JSON.stringify({
          updated_fields: Object.keys(filteredUpdates),
          previous_values: job,
          new_values: updatedJob
        })]
      );

      res.json({
        message: "Job requirement clarified successfully",
        job: updatedJob,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Clarify job error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const jobId = Array.isArray(id) ? id[0] : id;
    const updates: Partial<JobDescription> = req.body;

    if (!jobId) {
      res.status(400).json({ error: "Job ID is required" });
      return;
    }

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: "Validation failed",
        details: errors.array().map((err: any) => err.msg),
      });
      return;
    }

    if (Object.keys(updates).length === 0) {
      res
        .status(400)
        .json({ error: "At least one field must be provided for update" });
      return;
    }

    const client = await getClient();
    try {
      const job = await JobModel.update(client, jobId, updates);

      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      res.json({
        message: "Job updated successfully",
        job,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update job error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const jobId = Array.isArray(id) ? id[0] : id;

    if (!jobId) {
      res.status(400).json({ error: "Job ID is required" });
      return;
    }

    const client = await getClient();
    try {
      const deleted = await JobModel.delete(client, jobId);

      if (!deleted) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      res.json({
        message: "Job deleted successfully",
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getJobOptions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const client = await getClient();
    try {
      const [departments, locations] = await Promise.all([
        JobModel.getDepartments(client),
        JobModel.getLocations(client),
      ]);

      res.json({
        departments,
        locations,
        employment_types: [
          "full-time",
          "part-time",
          "contract",
          "internship",
          "temporary",
        ],
        education_levels: ["high-school", "bachelor", "master", "phd", "any"],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get job options error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Validation for job reassignment
export const reassignJobValidation = [
  body("new_owner_id")
    .isUUID()
    .withMessage("New owner ID must be a valid UUID"),
];

// Validation for force close
export const forceCloseJobValidation = [
  body("reason")
    .isLength({ min: 5, max: 500 })
    .withMessage("Reason must be between 5 and 500 characters")
    .trim(),
];

// Helper function to write audit logs
const writeJobAuditLog = async (
  userId: string,
  action: string,
  jobId: string,
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
        "job",
        jobId,
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

export const reassignJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const jobId = Array.isArray(id) ? id[0] : id;
    const { new_owner_id } = req.body;
    const authenticatedUser = (req as any).user;

    // Debugging logs
    console.log("[Reassign] Incoming request:", {
      jobId,
      new_owner_id,
      authenticatedUser: authenticatedUser ? { id: authenticatedUser.id, email: authenticatedUser.email, role: authenticatedUser.role } : null,
      requestBody: req.body
    });

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("[Reassign] Validation failed:", errors.array());
      res.status(400).json({
        error: "Validation failed",
        details: errors.array().map((err: any) => err.msg),
      });
      return;
    }

    console.log("[Reassign] Validation passed, proceeding to check job existence");

    const client = await getClient();
    try {
      // Check if job exists
      const existingJob = await client.query(
        "SELECT id, title, owner_user_id FROM jobs WHERE id = $1",
        [jobId]
      );

      console.log("[Reassign] Job query result:", existingJob.rows);

      if (existingJob.rows.length === 0) {
        console.log("[Reassign] Job not found");
        res.status(404).json({ error: "Job not found" });
        return;
      }

      const job = existingJob.rows[0];
      console.log("[Reassign] Job found:", job);

      // Check if new owner exists
      const newOwner = await client.query(
        "SELECT id, email FROM users WHERE id = $1",
        [new_owner_id]
      );

      console.log("[Reassign] New owner query result:", newOwner.rows);

      if (newOwner.rows.length === 0) {
        console.log("[Reassign] New owner not found");
        res.status(400).json({ error: "New owner not found" });
        return;
      }

      console.log("[Reassign] New owner found:", newOwner.rows[0]);

      // Update job ownership
      const result = await client.query(
        `UPDATE jobs 
         SET owner_user_id = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING id, title, owner_user_id, updated_at`,
        [new_owner_id, jobId]
      );

      const updatedJob = result.rows[0];
      console.log("[Reassign] Job updated successfully:", updatedJob);

      // Write audit log
      await writeJobAuditLog(
        req.user!.id,
        "REASSIGN_JOB",
        jobId,
        {
          job_title: job.title,
          previous_owner_id: job.owner_user_id,
          new_owner_id: new_owner_id,
          new_owner_email: newOwner.rows[0].email,
        },
        req.ip
      );

      res.json({
        message: "Job reassigned successfully",
        job: updatedJob,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Reassign job error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const forceCloseJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const jobId = Array.isArray(id) ? id[0] : id;
    const { reason } = req.body;
    const authenticatedUser = (req as any).user;

    // Debugging logs
    console.log("[Force Close] Incoming request:", {
      jobId,
      reason,
      authenticatedUser: authenticatedUser ? { id: authenticatedUser.id, email: authenticatedUser.email, role: authenticatedUser.role } : null,
      requestBody: req.body
    });

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("[Force Close] Validation failed:", errors.array());
      res.status(400).json({
        error: "Validation failed",
        details: errors.array().map((err: any) => err.msg),
      });
      return;
    }

    console.log("[Force Close] Validation passed, proceeding to check job existence");

    const client = await getClient();
    try {
      // Check if job exists
      const existingJob = await client.query(
        "SELECT id, title, status FROM jobs WHERE id = $1",
        [jobId]
      );

      console.log("[Force Close] Job query result:", existingJob.rows);

      if (existingJob.rows.length === 0) {
        console.log("[Force Close] Job not found");
        res.status(404).json({ error: "Job not found" });
        return;
      }

      const job = existingJob.rows[0];
      console.log("[Force Close] Job found:", job);

      // Check if job is already closed
      if (job.status === "closed" || job.status === "archived") {
        console.log("[Force Close] Job already closed:", job.status);
        res.status(400).json({
          error: "Job is already closed",
          message: `Job status is currently: ${job.status}`,
        });
        return;
      }

      console.log("[Force Close] Job status check passed, proceeding to update status");

      // Update job status to closed
      const result = await client.query(
        `UPDATE jobs 
         SET status = 'closed', updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, title, status, updated_at`,
        [jobId]
      );

      const updatedJob = result.rows[0];
      console.log("[Force Close] Job updated successfully:", updatedJob);

      // Write audit log
      await writeJobAuditLog(
        req.user!.id,
        "FORCE_CLOSE_JOB",
        jobId,
        {
          job_title: job.title,
          previous_status: job.status,
          new_status: "closed",
          reason: reason,
        },
        req.ip
      );

      res.json({
        message: "Job force-closed successfully",
        job: updatedJob,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Force close job error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get recruiter's assigned jobs
export const getMyAssignments = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    console.log('[getMyAssignments] Request:', { userId: req.user.id, page, limit });

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 500) {
      res.status(400).json({
        error: "Invalid pagination parameters. Page must be ≥1, limit must be between 1-500",
      });
      return;
    }

    const client = await getClient();
    try {
      // Get recruiter's assigned jobs with assignment details
      const offset = (page - 1) * limit;
      
      const query = `
        SELECT 
          j.id,
          j.title,
          j.department,
          j.description,
          j.required_skills,
          j.min_experience_years,
          j.max_experience_years,
          j.status,
          j.location,
          j.employment_type,
          j.salary_min,
          j.salary_max,
          j.created_at,
          j.updated_at,
          j.client_id,
          j.created_by_user_id,
          COALESCE(cl.company_name, 'Unknown Company') as company_name,
          ja.priority as assignment_priority,
          ja.assigned_at as assigned_at
        FROM job_descriptions j
        LEFT JOIN job_recruiter_assignments ja ON j.id = ja.job_id AND ja.recruiter_id = $1
        LEFT JOIN clients cl ON j.client_id::uuid = cl.id
        WHERE ja.recruiter_id IS NOT NULL
        ORDER BY ja.priority DESC, j.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      console.log('[getMyAssignments] Executing query with params:', [req.user.id, limit, offset]);
      const result = await client.query(query, [req.user.id, limit, offset]);
      console.log('[getMyAssignments] Query result count:', result.rows.length);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(DISTINCT j.id) as total
        FROM job_descriptions j
        LEFT JOIN job_recruiter_assignments ja ON j.id = ja.job_id AND ja.recruiter_id = $1
        WHERE ja.recruiter_id IS NOT NULL
      `;

      const countResult = await client.query(countQuery, [req.user.id]);
      const total = parseInt(countResult.rows[0].total);
      console.log('[getMyAssignments] Total count:', total);

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        jobs: result.rows,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_items: total,
          items_per_page: limit,
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage,
        },
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Get my assignments error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
};

// Get job details (read-only single job view)
export const getJobDetails = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const jobId = Array.isArray(id) ? id[0] : id;

    if (!jobId) {
      res.status(400).json({ error: "Bad Request", message: "Job ID is required" });
      return;
    }

    const client = await getClient();
    try {
      // Check if the existing getJobById already returns everything we need
      const query = `
        SELECT 
          j.id,
          j.title,
          j.department,
          j.description,
          j.required_skills,
          j.preferred_skills,
          j.min_experience_years,
          j.max_experience_years,
          j.education_level,
          j.education_requirement,
          j.seniority_level,
          j.location,
          j.employment_type,
          j.work_mode,
          j.salary_min,
          j.salary_max,
          j.salary_range,
          j.currency,
          j.status,
          j.created_at,
          j.updated_at,
          j.client_id,
          COALESCE(cl.company_name, 'Unknown Company') as company_name,
          -- Budget calculation from salary range
          CASE 
            WHEN j.salary_min IS NOT NULL AND j.salary_max IS NOT NULL 
            THEN (j.salary_min + j.salary_max) / 2
            WHEN j.salary_min IS NOT NULL THEN j.salary_min
            WHEN j.salary_max IS NOT NULL THEN j.salary_max
            ELSE NULL
          END as estimated_budget,
          -- Experience range as string
          CASE 
            WHEN j.min_experience_years IS NOT NULL AND j.max_experience_years IS NOT NULL 
            THEN j.min_experience_years || '-' || j.max_experience_years || ' years'
            WHEN j.min_experience_years IS NOT NULL 
            THEN j.min_experience_years || '+ years'
            ELSE 'Not specified'
          END as experience_range
        FROM job_descriptions j
        LEFT JOIN clients cl ON j.client_id::uuid = cl.id
        WHERE j.id = $1 AND j.status != 'archived'
      `;

      const result = await client.query(query, [jobId]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Not Found", message: "Job not found" });
        return;
      }

      const job = result.rows[0];

      res.json({
        job: job,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get job details error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Assign a recruiter to a job (Admin and Team Lead)
export const assignRecruiterToJob = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: jobId } = req.params;
    const { recruiter_id, priority } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const tenantId = (req as any).user?.tenant_id || "default";

    if (!jobId || !recruiter_id) {
      res.status(400).json({
        error: "Bad Request",
        message: "Job ID and recruiter ID are required",
      });
      return;
    }

    const client = await getClient();
    try {
      // Check if job exists
      const jobCheck = await client.query(
        "SELECT id, title FROM job_descriptions WHERE id = $1 AND tenant_id = $2",
        [jobId, tenantId]
      );

      if (jobCheck.rows.length === 0) {
        res.status(404).json({
          error: "Not Found",
          message: "Job not found",
        });
        return;
      }

      // Check if recruiter exists and get their team lead info
      const recruiterCheck = await client.query(
        "SELECT id, email, role, team_lead_id FROM users WHERE id = $1 AND tenant_id = $2",
        [recruiter_id, tenantId]
      );

      if (recruiterCheck.rows.length === 0) {
        res.status(404).json({
          error: "Not Found",
          message: "Recruiter not found",
        });
        return;
      }

      const recruiter = recruiterCheck.rows[0];

      // Team Lead scoping rule: Team leads can only assign their own recruiters
      if (userRole === 'team_lead' && recruiter.team_lead_id !== userId) {
        res.status(403).json({
          error: "Forbidden",
          message: "You can only assign recruiters who report to you",
        });
        return;
      }

      // Check if assignment already exists
      const existingAssignment = await client.query(
        "SELECT id FROM job_recruiter_assignments WHERE job_id = $1 AND recruiter_id = $2",
        [jobId, recruiter_id]
      );

      if (existingAssignment.rows.length > 0) {
        res.status(409).json({
          error: "Conflict",
          message: "Recruiter is already assigned to this job",
        });
        return;
      }

      // Create the assignment
      const assignmentResult = await client.query(
        `INSERT INTO job_recruiter_assignments (job_id, recruiter_id, assigned_by, priority, tenant_id, assigned_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [jobId, recruiter_id, userId, priority || 'medium', tenantId]
      );

      const assignment = assignmentResult.rows[0];

      // Log audit trail
      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [crypto.randomUUID(), userId, 'ASSIGN_RECRUITER', 'job_recruiter_assignments', assignment.id, JSON.stringify({
          job_id: jobId,
          recruiter_id: recruiter_id,
          recruiter_email: recruiter.email,
          priority: assignment.priority,
          assigned_by: userId
        })]
      );

      // Log activity
      await client.query(
        `INSERT INTO activity_log (id, action, entity_id, entity_type, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [crypto.randomUUID(), 'recruiter_assigned', jobId, 'job', userId]
      );

      res.status(201).json({
        message: "Recruiter assigned to job successfully",
        assignment: {
          id: assignment.id,
          job_id: assignment.job_id,
          recruiter_id: assignment.recruiter_id,
          recruiter_email: recruiter.email,
          priority: assignment.priority,
          assigned_at: assignment.assigned_at,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Assign recruiter to job error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
