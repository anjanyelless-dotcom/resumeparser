import { Request, Response } from "express";
import { getClient } from "../database/db";

// Get Offers
export const getOffers = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const jobId = req.query.jobId as string;
    const offerStatus = req.query.offerStatus as string;

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
      
      // Candidate must be in Offer phase (Interview Passed) or have an offer status
      conditions.push(`s.status IN ('Interview Passed', 'Offer Extended', 'Offer Accepted', 'Offer Declined', 'Joined', 'Placed')`);

      if (jobId) {
        conditions.push(`s.job_id = $${paramIndex}`);
        queryParams.push(jobId);
        paramIndex++;
      }
      
      if (offerStatus) {
        const offerStatuses = offerStatus.split(',').map(s => s.trim()).filter(Boolean);
        if (offerStatuses.length > 0) {
          const clauses: string[] = [];
          if (offerStatuses.includes('offer_accepted')) clauses.push('s.offer_accepted_at IS NOT NULL');
          if (offerStatuses.includes('offer_rejected')) clauses.push('s.offer_rejected_at IS NOT NULL');
          if (offerStatuses.includes('offer_extended')) clauses.push('(s.offer_extended_at IS NOT NULL AND s.offer_accepted_at IS NULL AND s.offer_rejected_at IS NULL)');
          if (offerStatuses.includes('pending')) clauses.push('(s.offer_extended_at IS NULL AND s.offer_accepted_at IS NULL AND s.offer_rejected_at IS NULL)');
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

      const offersQuery = `
        SELECT
          s.*,
          j.title as job_title,
          COALESCE(cl.company_name, 'Unknown Company') as job_company,
          c.full_name as candidate_name,
          c.email as candidate_email,
          CASE 
            WHEN s.status = 'Offer Accepted' THEN 'offer_accepted'
            WHEN s.status = 'Offer Declined' THEN 'offer_rejected'
            WHEN s.status = 'Offer Extended' THEN 'offer_extended'
            ELSE 'pending'
          END as offer_status
        FROM submissions s
        LEFT JOIN job_descriptions j ON s.job_id = j.id
        LEFT JOIN clients cl ON j.client_id = cl.id
        LEFT JOIN candidates c ON s.candidate_id = c.id
        WHERE ${whereClause}
        ORDER BY s.submitted_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const offersResult = await client.query(offersQuery, [...queryParams, limit, offset]);
      
      res.json({
        offers: offersResult.rows,
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
    console.error("Get offers error:", error);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch offers" });
  }
};

export const updateOfferStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes, offer_amount } = req.body;

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

      if (status === 'offer_extended') {
        updateFields.push('offer_extended_at = COALESCE(offer_extended_at, NOW())');
        updateFields.push(`status = 'Offer Extended'`);
      } else if (status === 'offer_accepted') {
        updateFields.push('offer_accepted_at = COALESCE(offer_accepted_at, NOW())');
        updateFields.push(`status = 'Offer Accepted'`);
      } else if (status === 'offer_rejected' || status === 'offer_declined') {
        updateFields.push('offer_rejected_at = COALESCE(offer_rejected_at, NOW())');
        updateFields.push(`status = 'Offer Declined'`);
      } else if (status === 'joined') {
        updateFields.push(`status = 'Joined'`);
      }

      if (notes) {
        updateFields.push('offer_notes = $' + paramIndex);
        queryParams.push(notes);
        paramIndex++;
      }
      
      if (offer_amount) {
        updateFields.push('offer_amount = $' + paramIndex);
        queryParams.push(offer_amount);
        paramIndex++;
      }

      if (updateFields.length === 1) {
        res.status(400).json({ error: 'Bad Request', message: 'Invalid offer status' });
        return;
      }

      const updateQuery = `
        UPDATE submissions
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;
      const result = await client.query(updateQuery, queryParams);
      
      await client.query('COMMIT');
      res.json({ message: 'Offer status updated', submission: result.rows[0] });
    } catch (e: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: 'Internal Error', message: e.message });
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
};
