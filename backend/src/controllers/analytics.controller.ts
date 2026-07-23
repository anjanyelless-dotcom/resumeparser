import { Request, Response } from "express";
import { query } from "../database/db";

// Helper to generate minimal valid PDF
const generatePDFBuffer = (data: {
  range: number;
  total: number;
  success: number;
  failed: number;
  success_rate: number;
  avg_time: number;
  avg_confidence: number;
}) => { 
  const streamContent = `BT
/F1 12 Tf
70 700 Td
(Analytics Report - Range: ${data.range} days) Tj
0 -20 Td
(Total Resumes Uploaded: ${data.total}) Tj
0 -15 Td
(Successfully Parsed: ${data.success}) Tj
0 -15 Td
(Failed Parsing: ${data.failed}) Tj
0 -15 Td
(Success Rate: ${data.success_rate.toFixed(2)}%) Tj
0 -15 Td
(Average Processing Time: ${data.avg_time.toFixed(2)}s) Tj
0 -15 Td
(Average Confidence Score: ${(data.avg_confidence * 100).toFixed(2)}%) Tj
ET`;

  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${streamContent.length} >>
stream
${streamContent}
endstream
endobj
xref
0 5
0000000000 65535 f 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
350
%%EOF`;

  return Buffer.from(content, "utf-8");
};

// GET /api/analytics/parsing-stats
export const getParsingStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const statsResult = await query(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'completed')::int as success,
        COUNT(*) FILTER (WHERE status = 'failed')::int as failed,
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 0)::float as avg_time,
        COALESCE(AVG(confidence_score), 0)::float as avg_conf
      FROM parsing_jobs
    `);

    const { total, success, failed, avg_time, avg_conf } = statsResult.rows[0];
    const success_rate = total > 0 ? (success / total) * 100 : 0;

    res.json({
      total_resumes: total,
      successfully_parsed: success,
      failed_parsing: failed,
      success_rate,
      average_parsing_time: avg_time,
      average_confidence_score: avg_conf * 100, // percentage for UI
    });
  } catch (error) {
    console.error("Get parsing stats error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to retrieve parsing stats" });
  }
};

// GET /api/analytics/skill-distribution
export const getSkillDistribution = async (req: Request, res: Response): Promise<void> => {
  try {
    const skillsResult = await query(`
      SELECT s.name as skill_name, COUNT(cs.candidate_id)::int as count
      FROM candidate_skills cs
      JOIN skills s ON cs.skill_id = s.id
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json(skillsResult.rows);
  } catch (error) {
    console.error("Get skill distribution error:", error);
    // Graceful fallback for skills table if not fully populated or not found
    res.json([]);
  }
};

// GET /api/analytics/metrics
export const getMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalResult = await query("SELECT COUNT(*)::int as count FROM candidates WHERE status != 'deleted'");
    const parsedResult = await query("SELECT COUNT(DISTINCT candidate_id)::int as count FROM parsing_jobs WHERE status = 'completed'");
    const validatedResult = await query("SELECT COUNT(DISTINCT candidate_id)::int as count FROM labeled_data WHERE action = 'approved'");
    const reviewedResult = await query("SELECT COUNT(DISTINCT candidate_id)::int as count FROM labeled_data");
    const matchedResult = await query("SELECT COUNT(DISTINCT candidate_id)::int as count FROM match_scores");
    
    // For shortlisted, query candidates with review_status = 'approved'
    const shortlistedResult = await query(`
      SELECT COUNT(*)::int as count 
      FROM candidates 
      WHERE review_status = 'approved'
    `);

    res.json({
      total_candidates: totalResult.rows[0].count,
      parsed_candidates: parsedResult.rows[0].count,
      validated_candidates: validatedResult.rows[0].count,
      reviewed_candidates: reviewedResult.rows[0].count,
      matched_candidates: matchedResult.rows[0].count,
      shortlisted_candidates: shortlistedResult.rows[0].count,
    });
  } catch (error) {
    console.error("Get metrics error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to retrieve metrics" });
  }
};

// GET /api/analytics/upload-trends
export const getUploadTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const rangeDays = parseInt(req.query.range as string) || 30;

    const trendsResult = await query(`
      SELECT 
        TO_CHAR(started_at, 'YYYY-MM-DD') as date,
        COUNT(*)::int as count,
        COUNT(*) FILTER (WHERE status = 'completed')::int as success_count,
        COUNT(*) FILTER (WHERE status = 'failed')::int as failure_count
      FROM parsing_jobs
      WHERE started_at >= NOW() - CAST($1 || ' days' AS INTERVAL)
      GROUP BY TO_CHAR(started_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `, [rangeDays]);

    res.json(trendsResult.rows);
  } catch (error) {
    console.error("Get upload trends error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to retrieve upload trends" });
  }
};

// GET /api/analytics/recruiter-activity
export const getRecruiterActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const reviewedResult = await query("SELECT COUNT(*)::int as count FROM labeled_data");
    const shortlistedResult = await query("SELECT COUNT(*)::int as count FROM candidates WHERE review_status = 'approved'");
    const rejectedResult = await query("SELECT COUNT(*)::int as count FROM candidates WHERE review_status = 'rejected'");
    const pendingResult = await query("SELECT COUNT(*)::int as count FROM candidates WHERE review_status = 'pending' AND status = 'success'");

    res.json({
      resumes_reviewed: reviewedResult.rows[0].count,
      candidates_shortlisted: shortlistedResult.rows[0].count,
      candidates_rejected: rejectedResult.rows[0].count,
      pending_reviews: pendingResult.rows[0].count,
    });
  } catch (error) {
    console.error("Get recruiter activity error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to retrieve recruiter activity" });
  }
};

// GET /api/accuracy/overview and GET /api/analytics/accuracy/overview
export const getAccuracyOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobsResult = await query(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'completed')::int as success,
        COUNT(*) FILTER (WHERE status = 'failed')::int as failed,
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 0)::float as avg_time,
        COALESCE(AVG(confidence_score), 0)::float as avg_conf
      FROM parsing_jobs
    `);

    const { total, success, failed, avg_time, avg_conf } = jobsResult.rows[0];
    const success_rate = total > 0 ? (success / total) * 100 : 100;

    const labeledResult = await query(`
      SELECT 
        COUNT(*)::int as total_labeled,
        COUNT(*) FILTER (WHERE action = 'corrected')::int as corrected,
        COUNT(*) FILTER (WHERE action = 'approved')::int as approved
      FROM labeled_data
    `);

    const { total_labeled, corrected, approved } = labeledResult.rows[0];
    const correction_rate = total_labeled > 0 ? (corrected / total_labeled) * 100 : 0;
    const field_accuracy_percentage = total_labeled > 0 ? (approved / total_labeled) * 100 : 100;

    // Calculate section scores from corrections
    const sectionCorrections = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE action = 'corrected' AND (corrected_fields->>'name' IS NOT NULL OR corrected_fields->>'email' IS NOT NULL OR corrected_fields->>'phone' IS NOT NULL))::int as contact,
        COUNT(*) FILTER (WHERE action = 'corrected' AND corrected_fields->>'skills' IS NOT NULL)::int as skills,
        COUNT(*) FILTER (WHERE action = 'corrected' AND (corrected_fields->>'companies' IS NOT NULL OR corrected_fields->>'job_titles' IS NOT NULL))::int as work,
        COUNT(*) FILTER (WHERE action = 'corrected' AND (corrected_fields->>'education_degrees' IS NOT NULL OR corrected_fields->>'universities' IS NOT NULL))::int as education
      FROM labeled_data
    `);

    const { contact, skills, work, education } = sectionCorrections.rows[0];

    const calculateScore = (correctedCount: number) => {
      return total_labeled > 0 ? (total_labeled - correctedCount) / total_labeled : 1.0;
    };

    const section_scores = [
      { label: "Contact Info", score: calculateScore(contact) },
      { label: "Skills", score: calculateScore(skills) },
      { label: "Work Experience", score: calculateScore(work) },
      { label: "Education", score: calculateScore(education) }
    ];

    // Get recent runs
    const recentRunsResult = await query(`
      SELECT 
        id::text as job_id, 
        status, 
        confidence_score::float as confidence, 
        COALESCE(error_message, filename, 'Parsing completed successfully') as notes 
      FROM parsing_jobs 
      ORDER BY started_at DESC 
      LIMIT 5
    `);

    // Get common error patterns (top fields corrected)
    const allCorrections = await query("SELECT corrected_fields FROM labeled_data WHERE action = 'corrected'");
    const fieldCounts: Record<string, number> = {};
    for (const row of allCorrections.rows) {
      const fields = row.corrected_fields;
      if (fields && typeof fields === "object") {
        for (const key of Object.keys(fields)) {
          fieldCounts[key] = (fieldCounts[key] || 0) + 1;
        }
      }
    }

    const common_error_patterns = Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => {
        const mapping: Record<string, string> = {
          name: "Contact Name",
          email: "Contact Email",
          phone: "Contact Phone",
          skills: "Skills List",
          companies: "Work Companies",
          job_titles: "Job Titles",
          education_degrees: "Degrees",
          universities: "Universities"
        };
        return mapping[key] || key;
      })
      .slice(0, 3);

    // Return combined object to satisfy both frontend callers
    res.json({
      total_jobs: total,
      success_jobs: success,
      failed_jobs: failed,
      success_rate,
      avg_processing_seconds: avg_time,
      avg_confidence: avg_conf,
      correction_rate,
      section_scores,
      recent_runs: recentRunsResult.rows,
      
      correction_count: corrected,
      field_accuracy_percentage,
      common_error_patterns: common_error_patterns.length > 0 ? common_error_patterns : ["None detected yet"]
    });
  } catch (error) {
    console.error("Get accuracy overview error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to retrieve accuracy overview" });
  }
};

// GET /api/analytics/export/csv
export const exportCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    const rangeDays = parseInt(req.query.range as string) || 30;

    const csvResult = await query(`
      SELECT 
        pj.id as job_id,
        c.full_name as candidate_name,
        pj.filename,
        pj.status,
        pj.confidence_score,
        pj.started_at,
        pj.completed_at
      FROM parsing_jobs pj
      LEFT JOIN candidates c ON pj.candidate_id = c.id
      WHERE pj.started_at >= NOW() - CAST($1 || ' days' AS INTERVAL)
      ORDER BY pj.started_at DESC
    `, [rangeDays]);

    let csvContent = "Job ID,Candidate Name,Filename,Status,Confidence,Started At,Completed At\n";
    for (const row of csvResult.rows) {
      const fields = [
        row.job_id,
        `"${(row.candidate_name || "").replace(/"/g, '""')}"`,
        `"${(row.filename || "").replace(/"/g, '""')}"`,
        row.status,
        row.confidence_score,
        row.started_at ? row.started_at.toISOString() : "",
        row.completed_at ? row.completed_at.toISOString() : ""
      ];
      csvContent += fields.join(",") + "\n";
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=parsing_analytics_range_${rangeDays}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error("Export CSV error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to export CSV" });
  }
};

// GET /api/analytics/export/pdf
export const exportPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const rangeDays = parseInt(req.query.range as string) || 30;

    const statsResult = await query(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'completed')::int as success,
        COUNT(*) FILTER (WHERE status = 'failed')::int as failed,
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 0)::float as avg_time,
        COALESCE(AVG(confidence_score), 0)::float as avg_conf
      FROM parsing_jobs
      WHERE started_at >= NOW() - CAST($1 || ' days' AS INTERVAL)
    `, [rangeDays]);

    const { total, success, failed, avg_time, avg_conf } = statsResult.rows[0];
    const success_rate = total > 0 ? (success / total) * 100 : 0;

    const pdfBuffer = generatePDFBuffer({
      range: rangeDays,
      total,
      success,
      failed,
      success_rate,
      avg_time,
      avg_confidence: avg_conf
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=parsing_analytics_range_${rangeDays}.pdf`);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("Export PDF error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to export PDF" });
  }
};
