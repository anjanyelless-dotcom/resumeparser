import { Request, Response } from "express";
import { getClient } from "../database/db";

// Get Placement Candidates
export const getPlacementCandidates = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const jobId = req.query.jobId as string;
    const placementStatus = req.query.placementStatus as string;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized", message: "User ID is required" });
      return;
    }

    const client = await getClient();
    try {
      const offset = (page - 1) * limit;

      let conditions = ['s.submitted_by = $1'];
      let queryParams: any[] = [userId];
      let paramIndex = 2;
      
      // Candidate must have joined
      conditions.push(`s.joining_date IS NOT NULL`);

      if (jobId) {
        conditions.push(`s.job_id = $${paramIndex}`);
        queryParams.push(jobId);
        paramIndex++;
      }
      
      if (placementStatus) {
        const placementStatuses = placementStatus.split(',').map(s => s.trim()).filter(Boolean);
        if (placementStatuses.length > 0) {
          const clauses: string[] = [];
          if (placementStatuses.includes('placed')) clauses.push('EXISTS (SELECT 1 FROM placements p WHERE p.submission_id = s.id)');
          if (placementStatuses.includes('pending')) clauses.push('NOT EXISTS (SELECT 1 FROM placements p WHERE p.submission_id = s.id)');
          if (clauses.length > 0) {
            conditions.push(`(${clauses.join(' OR ')})`);
          }
        }
      }
      
      const whereClause = conditions.join(' AND ');

      const countQuery = `
        SELECT COUNT(*) as total
        FROM submissions s
        WHERE ${whereClause}
      `;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      const placementQuery = `
        SELECT
          s.*,
          j.title as job_title,
          COALESCE(cl.company_name, 'Unknown Company') as job_company,
          c.full_name as candidate_name,
          c.email as candidate_email,
          CASE
            WHEN EXISTS (SELECT 1 FROM placements p WHERE p.submission_id = s.id) THEN 'placed'
            ELSE 'pending'
          END as placement_status
        FROM submissions s
        LEFT JOIN job_descriptions j ON s.job_id = j.id
        LEFT JOIN clients cl ON j.client_id = cl.id
        LEFT JOIN candidates c ON s.candidate_id = c.id
        WHERE ${whereClause}
        ORDER BY s.submitted_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const placementResult = await client.query(placementQuery, [...queryParams, limit, offset]);
      
      res.json({
        placements: placementResult.rows,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: limit,
          has_next_page: page < Math.ceil(total / limit),
          has_prev_page: page > 1,
        },
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get placement candidates error:", error);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch placement candidates" });
  }
};

// Create Placement
export const createPlacement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: submissionId } = req.params;
    const { joining_date, placement_fee, notes } = req.body;
    const userId = (req as any).user?.id;

    if (!submissionId) {
      res.status(400).json({ error: "Submission ID is required" });
      return;
    }

    if (!joining_date) {
      res.status(400).json({ error: "Joining date is required" });
      return;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Verify submission exists
      const subRes = await client.query("SELECT status, job_id, candidate_id FROM submissions WHERE id = $1", [submissionId]);
      if (subRes.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Submission not found" });
        return;
      }

      // Look up client_id and recruiter_id from the job
      const jobRes = await client.query(
        "SELECT client_id, created_by_user_id FROM job_descriptions WHERE id = $1",
        [subRes.rows[0].job_id]
      );
      const clientId = jobRes.rows[0]?.client_id || null;
      const recruiterId = jobRes.rows[0]?.created_by_user_id || userId;

      // Create placement record
      const insertQuery = `
        INSERT INTO placements (
          id, submission_id, job_id, candidate_id, client_id, recruiter_id,
          billing_amount, joining_date, notes, created_by, status, placed_at
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5,
          $6, $7, $8, $9, 'active', NOW()
        )
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [
        submissionId,                      // $1 submission_id
        subRes.rows[0].job_id,             // $2 job_id
        subRes.rows[0].candidate_id,       // $3 candidate_id
        clientId,                          // $4 client_id
        recruiterId,                       // $5 recruiter_id
        placement_fee ? parseFloat(placement_fee) : 0,  // $6 billing_amount
        joining_date,                      // $7 joining_date
        notes || null,                     // $8 notes
        userId                             // $9 created_by
      ]);

      // 1. Update submission status
      await client.query(
        "UPDATE submissions SET status = 'Placed', updated_at = NOW() WHERE id = $1",
        [submissionId]
      );

      // 2. Check job status and update to 'Completed' if all openings are filled
      const jobCheckRes = await client.query(
        `SELECT j.id, j.number_of_openings, COUNT(p.id) as current_placements
         FROM job_descriptions j
         LEFT JOIN placements p ON j.id = p.job_id
         WHERE j.id = $1
         GROUP BY j.id`,
        [subRes.rows[0].job_id]
      );

      if (jobCheckRes.rows.length > 0) {
        const jobInfo = jobCheckRes.rows[0];
        if (parseInt(jobInfo.current_placements) >= parseInt(jobInfo.number_of_openings)) {
          await client.query(
            "UPDATE job_descriptions SET status = 'completed', updated_at = NOW() WHERE id = $1",
            [jobInfo.id]
          );
        }
      }

      await client.query("COMMIT");

      res.status(201).json({
        message: "Placement created successfully",
        placement: result.rows[0]
      });

    } catch (error: any) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Create placement error:", error.message);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create placement",
      details: error.message
    });
  }
};

export const getPlacementRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await getClient();
    try {
      const recordsQuery = `
        SELECT 
          p.id, p.billing_amount, p.placed_at, p.joining_date,
          c.full_name as candidate_name, c.email as candidate_email,
          j.title as job_title, cl.company_name as client_name,
          SPLIT_PART(u.email, '@', 1) as recruiter_name
        FROM placements p
        LEFT JOIN candidates c ON p.candidate_id = c.id
        LEFT JOIN job_descriptions j ON p.job_id = j.id
        LEFT JOIN clients cl ON p.client_id = cl.id
        LEFT JOIN users u ON p.recruiter_id = u.id
        ORDER BY p.placed_at DESC
      `;
      const result = await client.query(recordsQuery);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get placement records error:", error);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch placement records" });
  }
};
