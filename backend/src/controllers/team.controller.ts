import { Request, Response } from "express";
import { getClient } from "../database/db";

// Get requirements for team lead (assigned to their recruiters or unassigned)
export const getTeamLeadRequirements = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const tenantId = (req as any).user?.tenant_id || "default";
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    if (!userId) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required",
      });
      return;
    }

    // Only team leads and admins can access this endpoint
    if (userRole !== 'team_lead' && userRole !== 'admin') {
      res.status(403).json({
        error: "Forbidden",
        message: "Only team leads and admins can access team requirements",
      });
      return;
    }

    const client = await getClient();
    try {
      let query = `
        SELECT DISTINCT
          j.id,
          j.title,
          j.description,
          j.department,
          j.location,
          j.status,
          j.employment_type,
          j.min_experience_years,
          j.max_experience_years,
          j.created_at,
          j.updated_at,
          j.client_id,
          c.company_name,
          COUNT(DISTINCT jra.recruiter_id) as assigned_recruiter_count,
          COUNT(DISTINCT CASE WHEN u.team_lead_id = $1 THEN jra.recruiter_id END) as my_team_recruiter_count,
          STRING_AGG(DISTINCT u.email, ', ') as assigned_recruiters_emails
        FROM job_descriptions j
        LEFT JOIN job_recruiter_assignments jra ON j.id = jra.job_id
        LEFT JOIN users u ON jra.recruiter_id = u.id
        LEFT JOIN clients c ON j.client_id = c.id
        WHERE j.tenant_id = $2
          AND j.status != 'archived'
      `;

      const params: any[] = [userId, tenantId];
      let paramCount = 2;

      // Add search filter
      if (search) {
        paramCount++;
        query += ` AND (j.title ILIKE $${paramCount} OR j.description ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      // Team lead filtering logic
      if (userRole === 'team_lead') {
        query += `
          AND (
            -- Show jobs assigned to team lead's recruiters
            EXISTS (
              SELECT 1 FROM job_recruiter_assignments jra2
              JOIN users u2 ON jra2.recruiter_id = u2.id
              WHERE jra2.job_id = j.id AND u2.team_lead_id = $1
            )
            -- OR show unassigned jobs (team leads can claim them)
            OR NOT EXISTS (
              SELECT 1 FROM job_recruiter_assignments jra3
              WHERE jra3.job_id = j.id
            )
          )
        `;
      }
      // Admins see all jobs (no additional filtering needed)

      query += `
        GROUP BY j.id, j.title, j.description, j.department, j.location, j.status, 
                 j.employment_type, j.min_experience_years, j.max_experience_years,
                 j.created_at, j.updated_at, j.client_id, c.company_name
        ORDER BY j.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      params.push(limit, offset);

      const result = await client.query(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(DISTINCT j.id) as total
        FROM job_descriptions j
        LEFT JOIN job_recruiter_assignments jra ON j.id = jra.job_id
        LEFT JOIN users u ON jra.recruiter_id = u.id
        WHERE j.tenant_id = $1
          AND j.status != 'archived'
      `;

      const countParams: any[] = [tenantId];
      let countParamCount = 1;

      if (search) {
        countParamCount++;
        countQuery += ` AND (j.title ILIKE $${countParamCount} OR j.description ILIKE $${countParamCount})`;
        countParams.push(`%${search}%`);
      }

      if (userRole === 'team_lead') {
        countQuery += `
          AND (
            EXISTS (
              SELECT 1 FROM job_recruiter_assignments jra2
              JOIN users u2 ON jra2.recruiter_id = u2.id
              WHERE jra2.job_id = j.id AND u2.team_lead_id = $2
            )
            OR NOT EXISTS (
              SELECT 1 FROM job_recruiter_assignments jra3
              WHERE jra3.job_id = j.id
            )
          )
        `;
        countParams.push(userId);
      }

      const countResult = await client.query(countQuery, countParams);
      const totalItems = parseInt(countResult.rows[0].total);

      const requirements = result.rows.map(row => ({
        ...row,
        assigned_recruiter_count: parseInt(row.assigned_recruiter_count),
        my_team_recruiter_count: parseInt(row.my_team_recruiter_count),
        is_my_team: row.my_team_recruiter_count > 0,
        is_unassigned: row.assigned_recruiter_count === 0,
      }));

      res.json({
        requirements,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalItems / limit),
          total_items: totalItems,
          items_per_page: limit,
          has_next_page: page < Math.ceil(totalItems / limit),
          has_prev_page: page > 1,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get team lead requirements error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch team requirements",
    });
  }
};

// Get team KPIs for team lead
export const getTeamKPIs = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const tenantId = (req as any).user?.tenant_id || "default";
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;

    if (!userId) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required",
      });
      return;
    }

    // Only team leads and admins can access this endpoint
    if (userRole !== 'team_lead' && userRole !== 'admin') {
      res.status(403).json({
        error: "Forbidden",
        message: "Only team leads and admins can access team KPIs",
      });
      return;
    }

    const client = await getClient();
    try {
      // Build date filter
      let dateFilter = "";
      const params: any[] = [tenantId];
      let paramCount = 1;

      if (fromDate || toDate) {
        dateFilter = " AND ";
        const conditions = [];
        if (fromDate) {
          conditions.push(`DATE_TRUNC('day', COALESCE(s.created_at, sr.created_at, al.created_at, i.created_at)) >= DATE_TRUNC('day', $${paramCount + 1})`);
          params.push(fromDate);
          paramCount++;
        }
        if (toDate) {
          conditions.push(`DATE_TRUNC('day', COALESCE(s.created_at, sr.created_at, al.created_at, i.created_at)) <= DATE_TRUNC('day', $${paramCount + 1})`);
          params.push(toDate);
          paramCount++;
        }
        dateFilter += conditions.join(" AND ");
      }

      // Team lead filtering
      let teamFilter = "";
      if (userRole === 'team_lead') {
        teamFilter = ` AND u.team_lead_id = $${paramCount + 1}`;
        params.push(userId);
        paramCount++;
      }

      // Single comprehensive query for all KPIs
      const query = `
        WITH team_recruiters AS (
          SELECT id, email, first_name, last_name
          FROM users u
          WHERE u.tenant_id = $1
            AND u.role = 'recruiter'
            AND u.is_active = true
            ${teamFilter}
        ),
        submission_stats AS (
          SELECT 
            tr.id as recruiter_id,
            tr.email as recruiter_email,
            tr.first_name || ' ' || tr.last_name as recruiter_name,
            COUNT(DISTINCT s.id) as submissions_count,
            COUNT(DISTINCT CASE WHEN s.status NOT IN ('rejected', 'offer_declined') THEN s.id END) as active_submissions_count
          FROM team_recruiters tr
          LEFT JOIN submissions s ON tr.id = s.submitted_by AND s.tenant_id = tr.id
          WHERE s.tenant_id = tr.id OR s.tenant_id IS NULL
            ${dateFilter}
          GROUP BY tr.id, tr.email, tr.first_name, tr.last_name
        ),
        review_stats AS (
          SELECT 
            tr.id as recruiter_id,
            COUNT(DISTINCT sr.id) as total_reviews,
            COUNT(DISTINCT CASE WHEN sr.decision = 'approved' THEN sr.id END) as approved_reviews
          FROM team_recruiters tr
          LEFT JOIN submissions s ON tr.id = s.submitted_by AND s.tenant_id = tr.id
          LEFT JOIN submission_reviews sr ON s.id = sr.submission_id
          WHERE (s.tenant_id = tr.id OR s.tenant_id IS NULL)
            ${dateFilter}
          GROUP BY tr.id
        ),
        interview_stats AS (
          SELECT 
            tr.id as recruiter_id,
            COUNT(DISTINCT i.id) as interviews_count
          FROM team_recruiters tr
          LEFT JOIN submissions s ON tr.id = s.submitted_by AND s.tenant_id = tr.id
          LEFT JOIN interviews i ON s.id = i.submission_id
          WHERE (s.tenant_id = tr.id OR s.tenant_id IS NULL)
            AND i.status != 'cancelled'
            ${dateFilter}
          GROUP BY tr.id
        ),
        activity_stats AS (
          SELECT 
            tr.id as recruiter_id,
            COUNT(DISTINCT al.id) as total_activities,
            COUNT(DISTINCT CASE WHEN al.action = 'submission_created' THEN al.id END) as submissions_created,
            COUNT(DISTINCT CASE WHEN al.action = 'submission_reviewed' THEN al.id END) as submissions_reviewed,
            COUNT(DISTINCT CASE WHEN al.action = 'interview_scheduled' THEN al.id END) as interviews_scheduled,
            COUNT(DISTINCT CASE WHEN al.action = 'candidate_created' THEN al.id END) as candidates_created,
            COUNT(DISTINCT CASE WHEN al.action = 'job_created' THEN al.id END) as jobs_created
          FROM team_recruiters tr
          LEFT JOIN activity_log al ON tr.id = al.user_id
          WHERE 1=1
            ${dateFilter}
          GROUP BY tr.id
        )
        SELECT 
          tr.id,
          tr.email,
          tr.name,
          COALESCE(ss.submissions_count, 0) as submissions_count,
          COALESCE(ss.active_submissions_count, 0) as active_submissions_count,
          COALESCE(rst.total_reviews, 0) as total_reviews,
          COALESCE(rst.approved_reviews, 0) as approved_reviews,
          CASE 
            WHEN COALESCE(rst.total_reviews, 0) > 0 
            THEN ROUND((COALESCE(rst.approved_reviews, 0)::decimal / COALESCE(rst.total_reviews, 0)) * 100, 2)
            ELSE 0 
          END as approval_rate,
          COALESCE(ist.interviews_count, 0) as interviews_count,
          COALESCE(ast.total_activities, 0) as total_activities,
          COALESCE(ast.submissions_created, 0) as submissions_created,
          COALESCE(ast.submissions_reviewed, 0) as submissions_reviewed,
          COALESCE(ast.interviews_scheduled, 0) as interviews_scheduled,
          COALESCE(ast.candidates_created, 0) as candidates_created,
          COALESCE(ast.jobs_created, 0) as jobs_created
        FROM team_recruiters tr
        LEFT JOIN submission_stats ss ON tr.id = ss.recruiter_id
        LEFT JOIN review_stats rst ON tr.id = rst.recruiter_id
        LEFT JOIN interview_stats ist ON tr.id = ist.recruiter_id
        LEFT JOIN activity_stats ast ON tr.id = ast.recruiter_id
        ORDER BY tr.email
      `;

      const result = await client.query(query, params);

      const kpis = result.rows.map(row => ({
        recruiter_id: row.id,
        recruiter_email: row.email,
        recruiter_name: row.name,
        submissions_count: parseInt(row.submissions_count),
        active_submissions_count: parseInt(row.active_submissions_count),
        total_reviews: parseInt(row.total_reviews),
        approved_reviews: parseInt(row.approved_reviews),
        approval_rate: parseFloat(row.approval_rate),
        interviews_count: parseInt(row.interviews_count),
        total_activities: parseInt(row.total_activities),
        activity_breakdown: {
          submissions_created: parseInt(row.submissions_created),
          submissions_reviewed: parseInt(row.submissions_reviewed),
          interviews_scheduled: parseInt(row.interviews_scheduled),
          candidates_created: parseInt(row.candidates_created),
          jobs_created: parseInt(row.jobs_created),
        }
      }));

      // Calculate team totals
      const teamTotals = kpis.reduce((acc, recruiter) => ({
        total_submissions: acc.total_submissions + recruiter.submissions_count,
        total_active_submissions: acc.total_active_submissions + recruiter.active_submissions_count,
        total_reviews: acc.total_reviews + recruiter.total_reviews,
        total_approved_reviews: acc.total_approved_reviews + recruiter.approved_reviews,
        total_interviews: acc.total_interviews + recruiter.interviews_count,
        total_activities: acc.total_activities + recruiter.total_activities,
        total_activity_breakdown: {
          submissions_created: acc.total_activity_breakdown.submissions_created + recruiter.activity_breakdown.submissions_created,
          submissions_reviewed: acc.total_activity_breakdown.submissions_reviewed + recruiter.activity_breakdown.submissions_reviewed,
          interviews_scheduled: acc.total_activity_breakdown.interviews_scheduled + recruiter.activity_breakdown.interviews_scheduled,
          candidates_created: acc.total_activity_breakdown.candidates_created + recruiter.activity_breakdown.candidates_created,
          jobs_created: acc.total_activity_breakdown.jobs_created + recruiter.activity_breakdown.jobs_created,
        }
      }), {
        total_submissions: 0,
        total_active_submissions: 0,
        total_reviews: 0,
        total_approved_reviews: 0,
        total_interviews: 0,
        total_activities: 0,
        total_activity_breakdown: {
          submissions_created: 0,
          submissions_reviewed: 0,
          interviews_scheduled: 0,
          candidates_created: 0,
          jobs_created: 0,
        }
      });

      // Calculate team approval rate
      const teamApprovalRate = teamTotals.total_reviews > 0 
        ? Math.round((teamTotals.total_approved_reviews / teamTotals.total_reviews) * 100 * 100) / 100
        : 0;

      res.json({
        kpis,
        team_totals: {
          ...teamTotals,
          approval_rate: teamApprovalRate,
          recruiter_count: kpis.length
        },
        date_range: {
          from: fromDate || null,
          to: toDate || null
        }
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get team KPIs error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch team KPIs",
    });
  }
};