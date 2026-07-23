import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { getClient } from "../database/db";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { buildScopeFilter } from "../utils/rbac.utils";

// Validation rules
export const createClientValidation = [
  body("company_name")
    .isLength({ min: 2, max: 255 })
    .withMessage("Company name must be between 2 and 255 characters")
    .trim(),
  body("industry")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Industry must be between 2 and 100 characters")
    .trim(),
  body("address")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Address must not exceed 500 characters")
    .trim(),
  body("city")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("City must be between 2 and 100 characters")
    .trim(),
  body("country")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Country must be between 2 and 100 characters")
    .trim(),
  body("owner_user_id")
    .optional()
    .isUUID()
    .withMessage("Owner user ID must be a valid UUID"),
];

export const updateClientValidation = [
  body("company_name")
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage("Company name must be between 2 and 255 characters")
    .trim(),
  body("industry")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Industry must be between 2 and 100 characters")
    .trim(),
  body("address")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Address must not exceed 500 characters")
    .trim(),
  body("city")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("City must be between 2 and 100 characters")
    .trim(),
  body("country")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Country must be between 2 and 100 characters")
    .trim(),
  body("owner_user_id")
    .optional()
    .isUUID()
    .withMessage("Owner user ID must be a valid UUID"),
];

export const createContactValidation = [
  body("contact_name")
    .isLength({ min: 2, max: 255 })
    .withMessage("Contact name must be between 2 and 255 characters")
    .trim(),
  body("designation")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Designation must be between 2 and 100 characters")
    .trim(),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("phone")
    .optional()
    .isLength({ min: 10, max: 50 })
    .withMessage("Phone number must be between 10 and 50 characters")
    .trim(),
  body("is_primary")
    .optional()
    .isBoolean()
    .withMessage("Is primary must be a boolean value"),
];

export const updateContactValidation = [
  body("contact_name")
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage("Contact name must be between 2 and 255 characters")
    .trim(),
  body("designation")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Designation must be between 2 and 100 characters")
    .trim(),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("phone")
    .optional()
    .isLength({ min: 10, max: 50 })
    .withMessage("Phone number must be between 10 and 50 characters")
    .trim(),
  body("is_primary")
    .optional()
    .isBoolean()
    .withMessage("Is primary must be a boolean value"),
];

export const updatePipelineStageValidation = [
  body("stage")
    .isIn(['lead', 'contacted', 'meeting_scheduled', 'proposal_sent', 'negotiation', 'won', 'lost'])
    .withMessage("Stage must be one of: lead, contacted, meeting_scheduled, proposal_sent, negotiation, won, lost"),
  body("notes")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Notes must not exceed 1000 characters")
    .trim(),
];

interface Client {
  id?: string;
  company_name: string;
  industry?: string;
  address?: string;
  city?: string;
  country?: string;
  owner_user_id?: string;
  is_archived?: boolean;
  tenant_id?: string;
  created_at?: Date;
  status?: string;
  pipeline_stage?: string;
}

interface ClientContact {
  id?: string;
  client_id: string;
  contact_name: string;
  designation?: string;
  email?: string;
  phone?: string;
  is_primary?: boolean;
  created_at?: Date;
}

interface ClientFilter {
  search?: string;
  industry?: string;
  city?: string;
  country?: string;
  is_archived?: boolean;
  status?: string;
  pipeline_stage?: string;
}

// Middleware to normalize client data
const normalizeClientData = (req: Request, res: Response, next: Function) => {
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

  // Note: Multi-tenancy support not yet implemented
  // Tenant filtering removed until user.tenant_id is available in JWT

  next();
};

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
      `INSERT INTO audit_logs (id, user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        crypto.randomUUID(),
        userId,
        action,
        resourceType,
        resourceId,
        details ? JSON.stringify(details) : null,
      ]
    );
  } catch (error) {
    console.error("Failed to write audit log:", error);
  } finally {
    client.release();
  }
};

// Controller functions
export const createClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const clientData: Partial<Client> = req.body;

    // Default owner_user_id to req.user.id if not explicitly provided
    let ownerId = clientData.owner_user_id;
    if (!ownerId) {
      ownerId = req.user?.id;
    }

    const client = await getClient();
    try {
      const result = await client.query(
        `INSERT INTO clients (company_name, industry, address, city, country, owner_user_id, tenant_id, created_at, pipeline_stage, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
         RETURNING id, company_name, industry, address, city, country, owner_user_id, tenant_id, created_at, pipeline_stage, status`,
        [
          clientData.company_name,
          clientData.industry || null,
          clientData.address || null,
          clientData.city || null,
          clientData.country || null,
          ownerId,
          clientData.tenant_id || 'default',
          clientData.pipeline_stage || 'lead',
          clientData.status || 'pipeline'
        ]
      );

      const createdClient = result.rows[0];

      // Insert into client_pipeline_history for initial 'lead' stage
      await client.query(
        `INSERT INTO client_pipeline_history (client_id, from_stage, to_stage, changed_by, notes, changed_at)
         VALUES ($1, NULL, $2, $3, 'Initial stage on client creation', NOW())`,
        [createdClient.id, createdClient.pipeline_stage, req.user!.id]
      );

      // Write audit log
      await writeAuditLog(
        req.user!.id,
        "CREATE_CLIENT",
        "client",
        createdClient.id,
        { company_name: createdClient.company_name, owner_user_id: createdClient.owner_user_id },
        req.ip
      );

      res.status(201).json({
        message: "Client created successfully",
        client: createdClient,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create client error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllClients = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const userId = (req as any).user?.id;

    const filters: ClientFilter = {
      search: (req.query.search as string) || undefined,
      industry: (req.query.industry as string) || undefined,
      city: (req.query.city as string) || undefined,
      country: (req.query.country as string) || undefined,
      is_archived: req.query.is_archived === "true" ? true : req.query.is_archived === "false" ? false : undefined,
      status: (req.query.status as string) || undefined,
    };

    const client = await getClient();
    try {
      // Build WHERE clause dynamically
      const whereConditions = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Add dynamic data scoping
      const scope = buildScopeFilter((req as any).user, 'clients', '');
      if (scope.sql) {
        // Strip leading ' AND ' or ' ' from scope.sql since we push to array
        const cleanSql = scope.sql.replace(/^\s*AND\s*/i, '').replace(/^\s+/, '');
        if (cleanSql) {
          whereConditions.push(cleanSql.replace('$PARAM', `$${paramIndex}`));
          queryParams.push(...scope.params);
          paramIndex += scope.params.length;
        }
      }

      if (filters.search) {
        whereConditions.push(`(c.company_name ILIKE $${paramIndex})`);
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters.industry) {
        whereConditions.push(`c.industry = $${paramIndex}`);
        queryParams.push(filters.industry);
        paramIndex++;
      }

      if (filters.city) {
        whereConditions.push(`c.city = $${paramIndex}`);
        queryParams.push(filters.city);
        paramIndex++;
      }

      if (filters.country) {
        whereConditions.push(`c.country = $${paramIndex}`);
        queryParams.push(filters.country);
        paramIndex++;
      }

      if (filters.is_archived !== undefined) {
        whereConditions.push(`c.is_archived = $${paramIndex}`);
        queryParams.push(filters.is_archived);
        paramIndex++;
      }

      if (filters.status) {
        whereConditions.push(`c.status = $${paramIndex}`);
        queryParams.push(filters.status);
        paramIndex++;
      }

      // Note: Multi-tenancy filtering removed until user.tenant_id is available in JWT

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM clients c ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total) || 0;

      // Get paginated results
      const offset = (page - 1) * limit;
      const dataQuery = `
        SELECT c.id, c.company_name, c.industry, c.address, c.city, c.country, c.owner_user_id, 
               c.pipeline_stage, c.status, c.is_archived, c.tenant_id, c.created_at,
               c.next_follow_up, c.last_activity,
               cc.contact_name as primary_contact_name,
               cc.email as primary_contact_email,
               cc.phone as primary_contact_phone,
               (SELECT COUNT(*) FROM job_descriptions jd WHERE jd.client_id = c.id) as total_requirements,
               (SELECT COUNT(*) FROM placements p WHERE p.client_id = c.id) as total_placements
        FROM clients c
        LEFT JOIN client_contacts cc ON c.id = cc.client_id AND cc.is_primary = true
        ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(limit, offset);

      const result = await client.query(dataQuery, queryParams);

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        clients: result.rows,
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
  } catch (error) {
    console.error("Get all clients error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getClientById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const clientId = Array.isArray(id) ? id[0] : id;

    const client = await getClient();
    try {
      const result = await client.query(
        `SELECT id, company_name, industry, address, city, country, owner_user_id, 
               pipeline_stage, status, is_archived, tenant_id, created_at,
               next_follow_up, last_activity
         FROM clients 
         WHERE id = $1`,
        [clientId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Client not found" });
        return;
      }

      res.json({ client: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get client by ID error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const clientId = Array.isArray(id) ? id[0] : id;

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: "Validation failed",
        details: errors.array().map((err: any) => err.msg),
      });
      return;
    }

    const clientData: Partial<Client> = req.body;

    const client = await getClient();
    try {
      // Check if client exists
      const existingResult = await client.query(
        "SELECT id, company_name FROM clients WHERE id = $1",
        [clientId]
      );

      if (existingResult.rows.length === 0) {
        res.status(404).json({ error: "Client not found" });
        return;
      }

      // Build dynamic UPDATE query
      const updateFields = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (clientData.company_name !== undefined) {
        updateFields.push(`company_name = $${paramIndex}`);
        updateValues.push(clientData.company_name);
        paramIndex++;
      }
      if (clientData.industry !== undefined) {
        updateFields.push(`industry = $${paramIndex}`);
        updateValues.push(clientData.industry);
        paramIndex++;
      }
      if (clientData.address !== undefined) {
        updateFields.push(`address = $${paramIndex}`);
        updateValues.push(clientData.address);
        paramIndex++;
      }
      if (clientData.city !== undefined) {
        updateFields.push(`city = $${paramIndex}`);
        updateValues.push(clientData.city);
        paramIndex++;
      }
      if (clientData.country !== undefined) {
        updateFields.push(`country = $${paramIndex}`);
        updateValues.push(clientData.country);
        paramIndex++;
      }
      if (clientData.owner_user_id !== undefined) {
        updateFields.push(`owner_user_id = $${paramIndex}`);
        updateValues.push(clientData.owner_user_id);
        paramIndex++;
      }

      if (clientData.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        updateValues.push(clientData.status);
        paramIndex++;
      }
      if (clientData.pipeline_stage !== undefined) {
        updateFields.push(`pipeline_stage = $${paramIndex}`);
        updateValues.push(clientData.pipeline_stage);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      const updateQuery = `
        UPDATE clients 
        SET ${updateFields.join(', ')}
        WHERE id = $${updateValues.length + 1}
        RETURNING id, company_name, industry, address, city, country, owner_user_id, pipeline_stage, status, is_archived, tenant_id, created_at, next_follow_up, last_activity
      `;

      updateValues.push(clientId);

      const result = await client.query(updateQuery, updateValues);
      const updatedClient = result.rows[0];

      // Write audit log
      await writeAuditLog(
        req.user!.id,
        "UPDATE_CLIENT",
        "client",
        updatedClient.id,
        { company_name: updatedClient.company_name, changes: clientData },
        req.ip
      );

      res.json({
        message: "Client updated successfully",
        client: updatedClient,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update client error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const archiveClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const clientId = Array.isArray(id) ? id[0] : id;

    const client = await getClient();
    try {
      // Check if client exists
      const existingResult = await client.query(
        "SELECT company_name, is_archived FROM clients WHERE id = $1",
        [clientId]
      );

      if (existingResult.rows.length === 0) {
        res.status(404).json({ error: "Client not found" });
        return;
      }

      const existingClient = existingResult.rows[0];

      // Check if client has active jobs
      const jobsResult = await client.query(
        `SELECT COUNT(*) as active_jobs 
         FROM job_descriptions 
         WHERE client_id = $1 AND status IN ('active', 'open')`,
        [clientId]
      );

      const activeJobs = parseInt(jobsResult.rows[0].active_jobs) || 0;

      if (activeJobs > 0) {
        res.status(400).json({
          error: "Cannot archive client",
          message: `Client has ${activeJobs} active job descriptions. Please reassign or close jobs first.`,
        });
        return;
      }

      // Archive the client
      const result = await client.query(
        "UPDATE clients SET is_archived = true WHERE id = $1 RETURNING *",
        [clientId]
      );

      const archivedClient = result.rows[0];

      // Write audit log
      await writeAuditLog(
        req.user!.id,
        "ARCHIVE_CLIENT",
        "client",
        archivedClient.id,
        { company_name: archivedClient.company_name, was_archived: true },
        req.ip
      );

      res.json({
        message: "Client archived successfully",
        client: archivedClient,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Archive client error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Contact-related controllers
export const getClientContacts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const clientIdStr = Array.isArray(id) ? id[0] : id;

    const client = await getClient();
    try {
      // Verify client exists and user owns it
      const clientResult = await client.query(
        "SELECT id, owner_user_id FROM clients WHERE id = $1",
        [clientIdStr]
      );

      if (clientResult.rows.length === 0) {
        res.status(404).json({ error: "Client not found" });
        return;
      }

      const clientData = clientResult.rows[0];

      // Verify ownership: user must own the client OR be admin
      if (clientData.owner_user_id !== req.user?.id && req.user?.role !== 'admin') {
        res.status(403).json({
          error: "Forbidden",
          message: "You can only view contacts for your own clients",
        });
        return;
      }

      const result = await client.query(
        `SELECT id, client_id, contact_name, designation, email, phone, is_primary, created_at
         FROM client_contacts 
         WHERE client_id = $1
         ORDER BY is_primary DESC, created_at ASC`,
        [clientIdStr]
      );

      res.json({ contacts: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get client contacts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const clientIdStr = Array.isArray(id) ? id[0] : id;

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: "Validation failed",
        details: errors.array().map((err: any) => err.msg),
      });
      return;
    }

    const contactData: Partial<ClientContact> = req.body;

    const client = await getClient();
    try {
      // Verify client exists and user owns it
      const clientResult = await client.query(
        "SELECT id, owner_user_id FROM clients WHERE id = $1",
        [clientIdStr]
      );

      if (clientResult.rows.length === 0) {
        res.status(404).json({ error: "Client not found" });
        return;
      }

      const clientData = clientResult.rows[0];

      // Verify ownership: user must own the client OR be admin
      if (clientData.owner_user_id !== req.user?.id && req.user?.role !== 'admin') {
        res.status(403).json({
          error: "Forbidden",
          message: "You can only add contacts to your own clients",
        });
        return;
      }

      // If this is set as primary, unset existing primary contact
      if (contactData.is_primary) {
        await client.query(
          "UPDATE client_contacts SET is_primary = false WHERE client_id = $1",
          [clientIdStr]
        );
      }

      const result = await client.query(
        `INSERT INTO client_contacts (client_id, contact_name, designation, email, phone, is_primary, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, client_id, contact_name, designation, email, phone, is_primary, created_at`,
        [
          clientIdStr,
          contactData.contact_name,
          contactData.designation || null,
          contactData.email || null,
          contactData.phone || null,
          contactData.is_primary || false,
        ]
      );

      const createdContact = result.rows[0];

      // Write audit log
      await writeAuditLog(
        req.user!.id,
        "CREATE_CONTACT",
        "contact",
        createdContact.id,
        {
          client_id: clientIdStr,
          contact_name: contactData.contact_name,
          email: contactData.email,
          phone: contactData.phone,
          position: contactData.designation,
          is_primary: contactData.is_primary,
        },
        req.ip
      );

      res.status(201).json({
        message: "Contact created successfully",
        contact: createdContact,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create contact error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const contactId = Array.isArray(id) ? id[0] : id;

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: "Validation failed",
        details: errors.array().map((err: any) => err.msg),
      });
      return;
    }

    const contactData: Partial<ClientContact> = req.body;

    const client = await getClient();
    try {
      // Get contact to verify it exists and check ownership
      const existingResult = await client.query(
        `SELECT cc.id, cc.client_id, c.id as client_exists, c.owner_user_id
         FROM client_contacts cc
         JOIN clients c ON cc.client_id = c.id
         WHERE cc.id = $1`,
        [contactId]
      );

      if (existingResult.rows.length === 0) {
        res.status(404).json({ error: "Contact not found" });
        return;
      }

      const contact = existingResult.rows[0];

      // Verify ownership: user must own the client OR be admin
      if (contact.owner_user_id !== req.user?.id && req.user?.role !== 'admin') {
        res.status(403).json({
          error: "Forbidden",
          message: "You can only update contacts for your own clients",
        });
        return;
      }

      // If setting as primary, unset existing primary contact for this client
      if (contactData.is_primary && !contact.is_primary) {
        await client.query(
          "UPDATE client_contacts SET is_primary = false WHERE client_id = $1",
          [contact.client_id]
        );
      }

      // Build dynamic UPDATE query
      const updateFields = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (contactData.contact_name !== undefined) {
        updateFields.push(`contact_name = $${paramIndex}`);
        updateValues.push(contactData.contact_name);
        paramIndex++;
      }
      if (contactData.designation !== undefined) {
        updateFields.push(`designation = $${paramIndex}`);
        updateValues.push(contactData.designation);
        paramIndex++;
      }
      if (contactData.email !== undefined) {
        updateFields.push(`email = $${paramIndex}`);
        updateValues.push(contactData.email);
        paramIndex++;
      }
      if (contactData.phone !== undefined) {
        updateFields.push(`phone = $${paramIndex}`);
        updateValues.push(contactData.phone);
        paramIndex++;
      }
      if (contactData.is_primary !== undefined) {
        updateFields.push(`is_primary = $${paramIndex}`);
        updateValues.push(contactData.is_primary);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      const updateQuery = `
        UPDATE client_contacts 
        SET ${updateFields.join(', ')}
        WHERE id = $${updateValues.length}
        RETURNING id, client_id, contact_name, designation, email, phone, is_primary, created_at
      `;

      updateValues.push(contactId);

      const result = await client.query(updateQuery, updateValues);
      const updatedContact = result.rows[0];

      // Write audit log
      await writeAuditLog(
        req.user!.id,
        "UPDATE_CONTACT",
        "contact",
        updatedContact.id,
        {
          contact_id: updatedContact.id,
          client_id: updatedContact.client_id,
          updated_fields: Object.keys(req.body),
        },
        req.ip
      );

      res.json({
        message: "Contact updated successfully",
        contact: updatedContact,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update contact error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const contactId = Array.isArray(id) ? id[0] : id;

    const client = await getClient();
    try {
      // Get contact to verify it exists and check ownership
      const existingResult = await client.query(
        `SELECT cc.id, cc.client_id, cc.is_primary, c.id as client_exists, c.owner_user_id
         FROM client_contacts cc
         JOIN clients c ON cc.client_id = c.id
         WHERE cc.id = $1`,
        [contactId]
      );

      if (existingResult.rows.length === 0) {
        res.status(404).json({ error: "Contact not found" });
        return;
      }

      const contact = existingResult.rows[0];

      // Verify ownership: user must own the client OR be admin
      if (contact.owner_user_id !== req.user?.id && req.user?.role !== 'admin') {
        res.status(403).json({
          error: "Forbidden",
          message: "You can only delete contacts for your own clients",
        });
        return;
      }

      // Don't allow deletion of primary contacts
      if (contact.is_primary) {
        res.status(400).json({
          error: "Cannot delete primary contact",
          message: "Please set another contact as primary before deleting this one.",
        });
        return;
      }

      await client.query("DELETE FROM client_contacts WHERE id = $1", [contactId]);

      // Write audit log
      await writeAuditLog(
        req.user!.id,
        "DELETE_CONTACT",
        "contact",
        contactId,
        {
          contact_id: contactId,
          deleted_contact_data: contact,
        },
        req.ip
      );

      res.json({
        message: "Contact deleted successfully",
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Delete contact error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updatePipelineStage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const clientId = Array.isArray(id) ? id[0] : id;
    const { stage, notes } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: "Validation failed",
        details: errors.array().map((err: any) => err.msg),
      });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Get current client data
      const clientResult = await client.query(
        `SELECT id, company_name, pipeline_stage, owner_user_id 
         FROM clients 
         WHERE id = $1`,
        [clientId]
      );

      if (clientResult.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Client not found" });
        return;
      }

      const clientData = clientResult.rows[0];
      const currentStage = clientData.pipeline_stage;
      console.log("Current stage from DB:", currentStage);
      console.log("Requested new stage:", stage);

      // Verify ownership: user must own the client OR have all-access permission
      const perms = (req as any).user?.permissions || [];
      const canManageAll = perms.includes('clients:view') || perms.includes('clients:view_all');
      if (clientData.owner_user_id !== userId && !canManageAll) {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: "Forbidden",
          message: "You can only update pipeline stage for your own clients",
        });
        return;
      }

      // Update client pipeline stage
      await client.query(
        `UPDATE clients 
         SET pipeline_stage = $1
         WHERE id = $2`,
        [stage, clientId]
      );

      // Insert into client_pipeline_history
      await client.query(
        `INSERT INTO client_pipeline_history (client_id, from_stage, to_stage, changed_by, notes, changed_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [clientId, currentStage, stage, userId, notes || null]
      );

      // Write audit log
      await writeAuditLog(
        userId,
        "UPDATE_PIPELINE_STAGE",
        "clients",
        clientId,
        {
          from_stage: currentStage,
          to_stage: stage,
          notes,
          client_name: clientData.company_name
        },
        req.ip
      );

      await client.query("COMMIT");

      res.json({
        message: "Pipeline stage updated successfully",
        client: {
          id: clientData.id,
          company_name: clientData.company_name,
          pipeline_stage: stage,
          previous_stage: currentStage,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Update pipeline stage error:", error.message);
    console.error("Error details:", {
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      column: error.column,
      table: error.table,
      stack: error.stack
    });
    res.status(500).json({ 
      error: error.message || "Internal server error",
      detail: error.detail
    });
  }
};

export const getBDMSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const client = await getClient();
    try {
      // Get current month start and end
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      // 1. newClientsThisMonth: COUNT from clients WHERE owner_user_id = req.user.id AND created_at in current month
      const newClientsResult = await client.query(
        `SELECT COUNT(*) as count
         FROM clients
         WHERE owner_user_id = $1
         AND created_at >= $2
         AND created_at <= $3`,
        [userId, monthStart.toISOString(), monthEnd.toISOString()]
      );
      const newClientsThisMonth = parseInt(newClientsResult.rows[0].count);

      // 2. openOpportunitiesCount: COUNT from clients WHERE owner_user_id = req.user.id AND pipeline_stage NOT IN ('won','lost') AND is_archived = false
      const openOpportunitiesResult = await client.query(
        `SELECT COUNT(*) as count
         FROM clients
         WHERE owner_user_id = $1
         AND pipeline_stage NOT IN ('won', 'lost')
         AND is_archived = false`,
        [userId]
      );
      const openOpportunitiesCount = parseInt(openOpportunitiesResult.rows[0].count);

      // 3. revenueGeneratedThisMonth: Set to 0 since placements table doesn't exist yet
      const revenueGeneratedThisMonth = 0;

      res.json({
        newClientsThisMonth,
        openOpportunitiesCount,
        revenueGeneratedThisMonth,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get BDM summary error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const convertClientToActive = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const clientId = Array.isArray(id) ? id[0] : id;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Verify client exists and check ownership/status
      const clientResult = await client.query(
        `SELECT id, company_name, pipeline_stage, status, owner_user_id 
         FROM clients 
         WHERE id = $1`,
        [clientId]
      );

      if (clientResult.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Client not found" });
        return;
      }

      const clientData = clientResult.rows[0];

      // Validate status
      if (clientData.status === 'active') {
        await client.query("ROLLBACK");
        res.status(400).json({ error: "Client is already active" });
        return;
      }

      // Validate pipeline stage is 'won'
      if (clientData.pipeline_stage !== 'won') {
        await client.query("ROLLBACK");
        res.status(400).json({ error: "Client pipeline stage must be 'won' before conversion" });
        return;
      }

      // Verify ownership
      const perms = (req as any).user?.permissions || [];
      const canManageAll = perms.includes('clients:manage') || perms.includes('clients:manage_all');
      if (clientData.owner_user_id !== userId && !canManageAll) {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: "Forbidden",
          message: "You can only convert your own clients",
        });
        return;
      }

      // Update status to active
      await client.query(
        `UPDATE clients 
         SET status = 'active'
         WHERE id = $1`,
        [clientId]
      );

      // Insert into history
      await client.query(
        `INSERT INTO client_pipeline_history (client_id, from_stage, to_stage, changed_by, notes, changed_at)
         VALUES ($1, $2, 'active_client', $3, 'Converted to Active Client', NOW())`,
        [clientId, clientData.pipeline_stage, userId]
      );

      // Write audit log
      await writeAuditLog(
        userId,
        "CONVERT_CLIENT",
        "clients",
        clientId,
        {
          previous_status: clientData.status,
          new_status: 'active',
          client_name: clientData.company_name
        },
        req.ip
      );

      await client.query("COMMIT");

      res.json({
        message: "Client converted to active successfully",
        client: {
          id: clientData.id,
          company_name: clientData.company_name,
          status: 'active',
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Convert client error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};