import { Request, Response } from "express";
import { getClient } from "../database/db";

// Get Joining Candidates
export const getJoiningCandidates = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const jobId = req.query.jobId as string;
    const joiningStatus = req.query.joiningStatus as string;

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
      
      // Candidate must have accepted an offer
      conditions.push(`s.status IN ('Offer Accepted', 'Joined', 'Dropped Out', 'Placed')`);

      if (jobId) {
        conditions.push(`s.job_id = $${paramIndex}`);
        queryParams.push(jobId);
        paramIndex++;
      }
      
      if (joiningStatus) {
        const joiningStatuses = joiningStatus.split(',').map(s => s.trim()).filter(Boolean);
        if (joiningStatuses.length > 0) {
          const clauses: string[] = [];
          if (joiningStatuses.includes('joined')) clauses.push('s.joining_date IS NOT NULL');
          if (joiningStatuses.includes('no_show')) clauses.push('s.no_show = TRUE');
          if (joiningStatuses.includes('pending')) clauses.push('(s.joining_date IS NULL AND (s.no_show IS NULL OR s.no_show = FALSE))');
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

      const joiningQuery = `
        SELECT
          s.*,
          j.title as job_title,
          COALESCE(cl.company_name, 'Unknown Company') as job_company,
          c.full_name as candidate_name,
          c.email as candidate_email,
          CASE
            WHEN s.status = 'Dropped Out' THEN 'no_show'
            WHEN s.status = 'Joined' THEN 'joined'
            ELSE 'pending'
          END as joining_status
        FROM submissions s
        LEFT JOIN job_descriptions j ON s.job_id = j.id
        LEFT JOIN clients cl ON j.client_id = cl.id
        LEFT JOIN candidates c ON s.candidate_id = c.id
        WHERE ${whereClause}
        ORDER BY s.submitted_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const joiningResult = await client.query(joiningQuery, [...queryParams, limit, offset]);
      
      res.json({
        joining: joiningResult.rows,
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
    console.error("Get joining error:", error);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch joining candidates" });
  }
};

export const updateJoiningStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, joining_date, notes } = req.body;

    if (!id || !status) {
      res.status(400).json({ error: 'Bad Request', message: 'ID and status are required' });
      return;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      const updateFields = ['updated_at = NOW()'];
      const queryParams: any[] = [id];
      let paramIndex = 2;

      if (status === 'joined') {
        updateFields.push(`status = 'Joined'`);
        if (joining_date) {
            updateFields.push('joining_date = $' + paramIndex);
            queryParams.push(joining_date);
            paramIndex++;
        }
      } else if (status === 'no_show') {
        updateFields.push('no_show = TRUE');
        updateFields.push(`status = 'Dropped Out'`);
      } else if (status === 'placed') {
        updateFields.push(`status = 'Placed'`);
        if (joining_date) {
            updateFields.push('joining_date = $' + paramIndex);
            queryParams.push(joining_date);
            paramIndex++;
        }
      } else if (status === 'offer_accepted') {
        updateFields.push(`status = 'Offer Accepted'`);
      }

      if (notes) {
        updateFields.push('offer_notes = $' + paramIndex);
        queryParams.push(notes);
        paramIndex++;
      }

      if (updateFields.length === 1) {
        res.status(400).json({ error: 'Bad Request', message: 'Invalid joining status' });
        return;
      }

      const updateQuery = `
        UPDATE submissions
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;
      const result = await client.query(updateQuery, queryParams);
      
      // If status is placed, insert into placements table
      if (status === 'placed') {
        const subInfoRes = await client.query(`
          SELECT s.job_id, s.candidate_id, s.placement_fee, j.client_id, j.created_by_user_id as recruiter_id
          FROM submissions s
          LEFT JOIN job_descriptions j ON s.job_id = j.id
          WHERE s.id = $1
        `, [id]);
        
        if (subInfoRes.rows.length > 0) {
          const subInfo = subInfoRes.rows[0];
          const existingPlacement = await client.query('SELECT 1 FROM placements WHERE candidate_id = $1 AND job_id = $2', [subInfo.candidate_id, subInfo.job_id]);
          
          if (existingPlacement.rows.length === 0) {
            const userId = (req as any).user?.id || subInfo.recruiter_id;
            await client.query(`
              INSERT INTO placements (
                id, job_id, candidate_id, client_id, recruiter_id,
                billing_amount, joining_date, notes, created_by, status, placed_at
              ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4,
                $5, $6, $7, $8, 'active', NOW()
              )
            `, [
              subInfo.job_id, subInfo.candidate_id, subInfo.client_id, subInfo.recruiter_id,
              subInfo.placement_fee || 0, joining_date || null, notes || null, userId
            ]);
          }
        }
      }
      
      await client.query('COMMIT');
      res.json({ message: 'Joining status updated', submission: result.rows[0] });
    } catch (e: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: 'Internal Error', message: e.message });
    } finally {
      client.release();
    }
  } catch (e: any) {
    res.status(500).json({ error: 'Internal Error', message: e.message });
  }
};
