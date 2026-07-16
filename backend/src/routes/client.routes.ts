import { Router, Request, Response, NextFunction } from "express";
import {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  archiveClient,
  getClientContacts,
  createContact,
  updateContact,
  deleteContact,
  updatePipelineStage,
  createClientValidation,
  updateClientValidation,
  createContactValidation,
  updateContactValidation,
  updatePipelineStageValidation,
} from "../controllers/client.controller";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

const router = Router();

// Middleware to normalize client data
const normalizeClientData = (req: Request, res: Response, next: NextFunction) => {
  // Normalize industry casing
  if (req.body.industry && typeof req.body.industry === "string") {
    req.body.industry = req.body.industry.trim().toLowerCase();
  }

  // Normalize city and country
  if (req.body.city && typeof req.body.city === "string") {
    req.body.city = req.body.city.trim();
  }
  if (req.body.country && typeof req.body.country === "string") {
    req.body.country = req.body.country.trim();
  }

  // Set tenant_id from authenticated user
  if ((req as any).user?.tenant_id) {
    req.body.tenant_id = (req as any).user.tenant_id;
  }

  next();
};

// Protect all client routes with authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/clients:
 *   post:
 *     summary: Create a new client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company_name
 *             properties:
 *               company_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *                 description: Company name
 *               industry:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Industry sector
 *               address:
 *                 type: string
 *                 maxLength: 500
 *                 description: Company address
 *               city:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: City
 *               country:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Country
 *               owner_user_id:
 *                 type: string
 *                 format: uuid
 *                 description: Owner user ID
 *     responses:
 *       201:
 *         description: Client created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post("/", normalizeClientData, createClientValidation, requirePermission("clients", "create"), createClient);

/**
 * @swagger
 * /api/clients:
 *   get:
 *     summary: Get all clients with pagination and filtering
 *     tags: [Clients]
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
 *         description: Search in company name
 *       - in: query
 *         name: industry
 *         schema:
 *           type: string
 *         description: Filter by industry
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *       - in: query
 *         name: is_archived
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by archive status
 *     responses:
 *       200:
 *         description: Clients retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get("/", requirePermission("clients", "view"), getAllClients);

/**
 * @swagger
 * /api/clients/{id}:
 *   get:
 *     summary: Get a specific client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Client not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", requirePermission("clients", "view"), getClientById);

/**
 * @swagger
 * /api/clients/{id}:
 *   put:
 *     summary: Update a client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *                 description: Company name
 *               industry:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Industry sector
 *               address:
 *                 type: string
 *                 maxLength: 500
 *                 description: Company address
 *               city:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: City
 *               country:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Country
 *               owner_user_id:
 *                 type: string
 *                 format: uuid
 *                 description: Owner user ID
 *     responses:
 *       200:
 *         description: Client updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Client not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id", normalizeClientData, updateClientValidation, requirePermission("clients", "edit"), updateClient);

/**
 * @swagger
 * /api/clients/{id}/archive:
 *   patch:
 *     summary: Archive a client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client archived successfully
 *       400:
 *         description: Cannot archive client with active jobs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Client not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/archive", requirePermission("clients", "delete"), archiveClient);

/**
 * @swagger
 * /api/clients/{id}/pipeline-stage:
 *   patch:
 *     summary: Update client pipeline stage
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Updates the pipeline stage of a client and records the change in history.
 *       Only the client owner or admin can update the pipeline stage.
 *       Valid stages: prospect, qualified, proposal_sent, negotiation, won, lost
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stage
 *             properties:
 *               stage:
 *                 type: string
 *                 enum: [prospect, qualified, proposal_sent, negotiation, won, lost]
 *                 description: New pipeline stage
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Optional notes about the stage change
 *     responses:
 *       200:
 *         description: Pipeline stage updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 client:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     company_name:
 *                       type: string
 *                     pipeline_stage:
 *                       type: string
 *                     previous_stage:
 *                       type: string
 *       400:
 *         description: Validation error - invalid stage
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the client owner
 *       404:
 *         description: Client not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/pipeline-stage", updatePipelineStageValidation, requirePermission("clients", "manage_pipeline"), updatePipelineStage);

/**
 * @swagger
 * /api/clients/{id}/contacts:
 *   get:
 *     summary: Get all contacts for a client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Contacts retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Client not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id/contacts", requirePermission("contacts", "manage_own"), getClientContacts);

/**
 * @swagger
 * /api/clients/{id}/contacts:
 *   post:
 *     summary: Create a new contact for a client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contact_name
 *             properties:
 *               contact_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *                 description: Contact name
 *               designation:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Job title or designation
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 50
 *                 description: Phone number
 *               is_primary:
 *                 type: boolean
 *                 description: Whether this is the primary contact
 *     responses:
 *       201:
 *         description: Contact created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: client not found
 *       500:
 *         description: Internal server error
 */
router.post("/:id/contacts", createContactValidation, requirePermission("contacts", "manage_own"), createContact);

/**
 * @swagger
 * /api/contacts/{id}:
 *   put:
 *     summary: Update a contact
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Contact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contact_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *                 description: Contact name
 *               designation:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Job title or designation
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 50
 *                 description: Phone number
 *               is_primary:
 *                 type: boolean
 *                 description: Whether this is the primary contact
 *     responses:
 *       200:
 *         description: Contact updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Contact not found
 *       500:
 *         description: Internal server error
 */
router.put("/contacts/:id", updateContactValidation, requirePermission("contacts", "manage_own"), updateContact);

/**
 * @swagger
 * /api/contacts/{id}:
 *   delete:
 *     summary: Delete a contact
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: validation: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact deleted successfully
 *       400:
 *         description: Cannot delete primary contact
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Contact not found
 *       500:
 *         description: Internal server error
 */
router.delete("/contacts/:id", requirePermission("contacts", "manage_own"), deleteContact);

export default router;