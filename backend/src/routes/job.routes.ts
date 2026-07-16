import { Router, Request, Response, NextFunction } from "express";
import {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  getJobOptions,
  reassignJob,
  forceCloseJob,
  getMyAssignments,
  getJobDetails,
  assignRecruiterToJob,
  clarifyJob,
  createJobValidation,
  updateJobValidation,
  clarifyJobValidation,
  reassignJobValidation,
  forceCloseJobValidation,
} from "../controllers/job.controller";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

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

  // 4. Map min_experience_years to experience_years for database
  if (req.body.min_experience_years !== undefined) {
    req.body.experience_years = req.body.min_experience_years;
    delete req.body.min_experience_years;
  }

  // 5. Remove fields that don't exist in database schema
  const allowedFields = [
    'title', 'description', 'required_skills', 'department', 'location',
    'employment_type', 'experience_years', 'salary_min', 'salary_max',
    'status', 'client_id'
  ];
  Object.keys(req.body).forEach(key => {
    if (!allowedFields.includes(key)) {
      delete req.body[key];
    }
  });

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
router.post("/", normalizeJobData, createJobValidation, requirePermission("requirements", "create"), createJob);

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
 *       - in: query
 *         name: adminView
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Admin view to see all jobs across owners with client info
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions for admin view
 */
router.get("/", (req, res, next) => {
  if (req.query.adminView === "true") {
    requirePermission("requirements", "view_all")(req, res, next);
  } else {
    next();
  }
}, getAllJobs);

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
 * /api/jobs/my-assignments:
 *   get:
 *     summary: Get jobs assigned to the current recruiter
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
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Recruiter assignments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         description: Job ID
 *                       title:
 *                         type: string
 *                         description: Job title
 *                       department:
 *                         type: string
 *                         description: Job department
 *                       description:
 *                         type: string
 *                         description: Job description
 *                       required_skills:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Required skills
 *                       location:
 *                         type: string
 *                         description: Job location
 *                       employment_type:
 *                         type: string
 *                         description: Employment type
 *                       status:
 *                         type: string
 *                         description: Job status
 *                       company_name:
 *                         type: string
 *                         description: Client company name
 *                       assignment_priority:
 *                         type: string
 *                         description: Assignment priority (low/normal/high/urgent)
 *                       assigned_at:
 *                         type: string
 *                         format: date-time
 *                         description: When the job was assigned
 *                       days_open:
 *                         type: number
 *                         description: Number of days the job has been open
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current_page:
 *                       type: integer
 *                       description: Current page number
 *                     total_pages:
 *                       type: integer
 *                       description: Total number of pages
 *                     total_items:
 *                       type: integer
 *                       description: Total number of jobs
 *                     items_per_page:
 *                       type: integer
 *                       description: Number of items per page
 *                     has_next_page:
 *                       type: boolean
 *                       description: Whether there's a next page
 *                     has_prev_page:
 *                       type: boolean
 *                       description: Whether there's a previous page
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions - requirePermission("requirements", "view_assigned")
 *       400:
 *         description: Bad Request - Invalid pagination parameters
 *       500:
 *         description: Internal server error
 */
router.get("/my-assignments", requirePermission("requirements", "view_assigned"), async (req, res) => {
  try {
    console.log('[Route /my-assignments] Request received');
    await getMyAssignments(req as any, res);
  } catch (error: any) {
    console.error('[Route /my-assignments] Error:', error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message,
      stack: error.stack 
    });
  }
});

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

/**
 * @swagger
 * /api/jobs/{id}/reassign:
 *   patch:
 *     summary: Reassign a job to a new owner
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
 *             required:
 *               - new_owner_id
 *             properties:
 *               new_owner_id:
 *                 type: string
 *                 format: uuid
 *                 description: New owner user ID
 *     responses:
 *       200:
 *         description: Job reassigned successfully
 *       400:
 *         description: Validation error or new owner not found
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.patch("/:id/reassign", reassignJobValidation, requirePermission("requirements", "edit"), reassignJob);

/**
 * @swagger
 * /api/jobs/{id}/clarify:
 *   patch:
 *     summary: Clarify job requirements (Client Manager only)
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
 *               description:
 *                 type: string
 *                 minLength: 50
 *                 description: Updated job description
 *               required_skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Updated required skills
 *               location:
 *                 type: string
 *                 maxLength: 100
 *                 description: Updated location
 *               min_experience_years:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 50
 *                 description: Updated minimum experience years
 *               max_experience_years:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 50
 *                 description: Updated maximum experience years
 *               education_level:
 *                 type: string
 *                 enum: [any, high_school, associate, bachelor, master, phd]
 *                 description: Updated education level
 *               salary_min:
 *                 type: number
 *                 minimum: 0
 *                 description: Updated minimum salary
 *               salary_max:
 *                 type: number
 *                 minimum: 0
 *                 description: Updated maximum salary
 *     responses:
 *       200:
 *         description: Job requirements clarified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 job:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     required_skills:
 *                       type: array
 *                       items:
 *                         type: string
 *                     location:
 *                       type: string
 *                     min_experience_years:
 *                       type: integer
 *                     max_experience_years:
 *                       type: integer
 *                     education_level:
 *                       type: string
 *                     salary_min:
 *                       type: number
 *                     salary_max:
 *                       type: number
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error or no valid fields to update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Job does not belong to user's clients
 *       404:
 *         description: Job not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/clarify", clarifyJobValidation, requirePermission("requirements", "clarify_own"), clarifyJob);

/**
 * @swagger
 * /api/jobs/{id}/force-close:
 *   patch:
 *     summary: Force close a job description
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
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 500
 *                 description: Reason for force closing the job
 *     responses:
 *       200:
 *         description: Job force-closed successfully
 *       400:
 *         description: Validation error or job already closed
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.patch("/:id/force-close", forceCloseJobValidation, requirePermission("requirements", "delete"), forceCloseJob);



/**
 * @swagger
 * /api/jobs/{id}/details:
 *   get:
 *     summary: Get detailed job information (read-only view)
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
 *         description: Job details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 job:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       description: Job ID
 *                     title:
 *                       type: string
 *                       description: Job title
 *                     department:
 *                       type: string
 *                       description: Job department
 *                     description:
 *                       type: string
 *                       description: Job description
 *                     required_skills:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Required skills
 *                     preferred_skills:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Preferred skills
 *                     experience_range:
 *                       type: string
 *                       description: Experience requirements range
 *                     education_level:
 *                       type: string
 *                       description: Required education level
 *                     location:
 *                       type: string
 *                       description: Job location
 *                     employment_type:
 *                       type: string
 *                       description: Employment type
 *                     work_mode:
 *                       type: string
 *                       description: Work mode (remote/hybrid/onsite)
 *                     salary_range:
 *                       type: string
 *                       description: Salary range
 *                     currency:
 *                       type: string
 *                       description: Currency
 *                     status:
 *                       type: string
 *                       description: Job status
 *                     company_name:
 *                       type: string
 *                       description: Client company name
 *                     estimated_budget:
 *                       type: number
 *                       description: Estimated budget (midpoint of salary range)
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       description: When the job was created
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       description: When the job was last updated
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/:id/details", getJobDetails);

/**
 * @swagger
 * /recruiter/requirements:
 *   get:
 *     summary: Get recruiter's assigned job requirements (alias for /api/jobs/my-assignments)
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
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Recruiter requirements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         description: Job ID
 *                       title:
 *                         type: string
 *                         description: Job title
 *                       company_name:
 *                         type: string
 *                         description: Client company name
 *                       assignment_priority:
 *                         type: string
 *                         description: Assignment priority
 *                       days_open:
 *                         type: number
 *                         description: Days job has been open
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current_page:
 *                       type: integer
 *                       description: Current page number
 *                     total_pages:
 *                       type: integer
 *                       description: Total number of pages
 *                     total_items:
 *                       type: integer
 *                       description: Total number of jobs
 *                     items_per_page:
 *                       type: integer
 *                       description: Number of items per page
 *                     has_next_page:
 *                       type: boolean
 *                       description: Whether there's a next page
 *                     has_prev_page:
 *                       type: boolean
 *                       description: Whether there's a previous page
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get("/recruiter/requirements", requirePermission("requirements", "view_assigned"), getMyAssignments);

/**
 * @swagger
 * /api/jobs/{id}/assign-recruiter:
 *   post:
 *     summary: Assign a recruiter to a job
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
 *             required:
 *               - recruiter_id
 *             properties:
 *               recruiter_id:
 *                 type: string
 *                 format: uuid
 *                 description: Recruiter ID to assign
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *                 description: Assignment priority
 *     responses:
 *       201:
 *         description: Recruiter assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 assignment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     job_id:
 *                       type: string
 *                     recruiter_id:
 *                       type: string
 *                     recruiter_email:
 *                       type: string
 *                     priority:
 *                       type: string
 *                     assigned_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad Request - Missing required fields
 *       403:
 *         description: Forbidden - Team lead trying to assign recruiter outside their team
 *       404:
 *         description: Job or recruiter not found
 *       409:
 *         description: Conflict - Recruiter already assigned to this job
 *       500:
 *         description: Internal server error
 */
router.post("/:id/assign-recruiter", requirePermission("requirements", "assign_recruiters"), assignRecruiterToJob);

export default router;
