import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { getClient } from "../database/db";
import { JobModel, JobDescription, JobFilter } from "../models/job.model";

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
    .withMessage("Maximum experience must be between 0 and 50 years")
    .custom((value: number, { req }: { req: any }) => {
      if (
        req.body.min_experience_years !== undefined &&
        value !== undefined &&
        req.body.min_experience_years > value
      ) {
        throw new Error(
          "Minimum experience cannot be greater than maximum experience",
        );
      }
      return true;
    }),
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
];

// Controller functions
export const createJob = async (req: Request, res: Response): Promise<void> => {
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

    const client = await getClient();
    try {
      const job = await JobModel.create(client, jobData);

      res.status(201).json({
        message: "Job created successfully",
        job,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create job error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllJobs = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

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
    };

    const client = await getClient();
    try {
      const { jobs, total } = await JobModel.findAll(
        client,
        page,
        limit,
        filters,
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
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get all jobs error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getJobById = async (
  req: Request,
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

      res.json({ job });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get job by ID error:", error);
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
