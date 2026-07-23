import { Router, Request, Response, NextFunction } from "express";
import {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  getJobOptions,
  createJobValidation,
  updateJobValidation,
} from "../controllers/job.controller";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";

const router = Router();

// Middleware to normalize job payload from frontend format to backend validation rules
const normalizeJobData = (req: Request, res: Response, next: NextFunction) => {
  // 1. Normalize employment_type casing and resolve "remote" -> "full-time"
  if (req.body.employment_type && typeof req.body.employment_type === "string") {
    const typeLower = req.body.employment_type.toLowerCase();
    if (typeLower === "remote") {
      req.body.employment_type = "full-time";
    } else {
      req.body.employment_type = typeLower;
    }
  }

  // 2. Map skills object array to string array for validation
  if (Array.isArray(req.body.required_skills)) {
    req.body.required_skills = req.body.required_skills.map((s: any) =>
      typeof s === "string" ? s : s.skill_name || ""
    ).filter((s: string) => s.trim().length > 0);
  }

  // 3. Map education_requirement to education_level for enum validation
  if (req.body.education_requirement && typeof req.body.education_requirement === "string") {
    const eduMap: { [key: string]: string } = {
      "high school": "high-school",
      "associate": "any",
      "bachelor": "bachelor",
      "master": "master",
      "phd": "phd",
      "none": "any",
    };
    const key = req.body.education_requirement.toLowerCase();
    req.body.education_level = eduMap[key] || "any";
  }

  next();
};

// All job routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create a new job description
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - required_skills
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *                 description: Job title
 *               department:
 *                 type: string
 *                 maxLength: 100
 *                 description: Department name
 *               location:
 *                 type: string
 *                 maxLength: 100
 *                 description: Job location
 *               employment_type:
 *                 type: string
 *                 enum: [full-time, part-time, contract, internship, temporary]
 *                 description: Type of employment
 *               description:
 *                 type: string
 *                 minLength: 50
 *                 description: Full job description
 *               required_skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 1
 *                   maxLength: 100
 *                 description: Array of required skills
 *               min_experience_years:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 50
 *                 description: Minimum years of experience required
 *               max_experience_years:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 50
 *                 description: Maximum years of experience preferred
 *               education_level:
 *                 type: string
 *                 enum: [high-school, bachelor, master, phd, any]
 *                 description: Required education level
 *               salary_min:
 *                 type: integer
 *                 minimum: 0
 *                 description: Minimum salary
 *               salary_max:
 *                 type: integer
 *                 minimum: 0
 *                 description: Maximum salary
 *     responses:
 *       201:
 *         description: Job created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/", normalizeJobData, createJobValidation, createJob);

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: Get all job descriptions with pagination and filters
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search in title, description, or department
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Filter by department
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Filter by location
 *       - in: query
 *         name: employment_type
 *         schema:
 *           type: string
 *           enum: [full-time, part-time, contract, internship, temporary]
 *         description: Filter by employment type
 *       - in: query
 *         name: min_experience
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 50
 *         description: Filter by minimum experience years
 *       - in: query
 *         name: max_experience
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 50
 *         description: Filter by maximum experience years
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/", getAllJobs);

/**
 * @swagger
 * /api/jobs/options:
 *   get:
 *     summary: Get job filter options (departments, locations, etc.)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Options retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/options", getJobOptions);

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get a specific job description
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job retrieved successfully
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", getJobById);

/**
 * @swagger
 * /api/jobs/{id}:
 *   put:
 *     summary: Update a job description
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *               department:
 *                 type: string
 *                 maxLength: 100
 *               location:
 *                 type: string
 *                 maxLength: 100
 *               employment_type:
 *                 type: string
 *                 enum: [full-time, part-time, contract, internship, temporary]
 *               description:
 *                 type: string
 *                 minLength: 50
 *               required_skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 1
 *                   maxLength: 100
 *               min_experience_years:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 50
 *               max_experience_years:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 50
 *               education_level:
 *                 type: string
 *                 enum: [high-school, bachelor, master, phd, any]
 *               salary_min:
 *                 type: integer
 *                 minimum: 0
 *               salary_max:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Job updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 */
router.put("/:id", normalizeJobData, updateJobValidation, updateJob);

/**
 * @swagger
 * /api/jobs/{id}:
 *   delete:
 *     summary: Delete a job description
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job deleted successfully
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/:id", deleteJob);

export default router;
