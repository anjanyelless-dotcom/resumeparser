import { PoolClient } from "pg";
import { JobFilter } from "../models/job.model";

export class JobDashboardService {
  /**
   * Fetches jobs with full recruitment dashboard metrics aggregated via efficient SQL.
   */
  static async getDashboardJobs(
    client: PoolClient,
    page: number = 1,
    limit: number = 20,
    filters: JobFilter = {},
    scopeFilter?: { sql: string; params: any[] },
    user?: any
  ) {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // RBAC Scope
    if (scopeFilter && scopeFilter.sql) {
      let scopedSql = scopeFilter.sql;
      for (const param of scopeFilter.params) {
        scopedSql = scopedSql.replace('$PARAM', `$${paramCount}`);
        values.push(param);
        paramCount++;
      }
      if (scopedSql.trim().toUpperCase().startsWith('AND ')) {
        scopedSql = scopedSql.trim().substring(4);
      }
      if (scopedSql) conditions.push(scopedSql);
    }

    if (filters.search) {
      conditions.push(`(j.title ILIKE $${paramCount} OR j.description ILIKE $${paramCount})`);
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    if (filters.department) {
      conditions.push(`j.department = $${paramCount}`);
      values.push(filters.department);
      paramCount++;
    }

    if (filters.location) {
      conditions.push(`j.location = $${paramCount}`);
      values.push(filters.location);
      paramCount++;
    }

    if (filters.employment_type) {
      conditions.push(`j.employment_type = $${paramCount}`);
      values.push(filters.employment_type);
      paramCount++;
    }

    if (filters.min_experience !== undefined) {
      conditions.push(`j.min_experience_years >= $${paramCount}`);
      values.push(filters.min_experience);
      paramCount++;
    }

    if (filters.max_experience !== undefined) {
      conditions.push(`j.max_experience_years <= $${paramCount}`);
      values.push(filters.max_experience);
      paramCount++;
    }

    if (filters.created_by_user_id) {
      conditions.push(`j.created_by_user_id::text = $${paramCount}`);
      values.push(filters.created_by_user_id);
      paramCount++;
    }

    if (filters.status) {
      conditions.push(`(j.approval_status = $${paramCount} OR j.recruitment_status = $${paramCount})`);
      values.push(filters.status);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `SELECT COUNT(*) FROM job_descriptions j ${whereClause}`;
    const countResult = await client.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT 
        j.*,
        c.company_name as client_name,
        u.email as owner_name,
        
        -- Priority
        COALESCE(j.priority, 'Medium') as priority,
        
        -- Team Lead Info
        tla.team_lead_id,
        tlu.email as team_lead_name,
        CASE WHEN tla.team_lead_id IS NOT NULL THEN 'Assigned' ELSE 'Not Assigned' END as team_lead_assignment_status,
        
        -- Recruiter Info
        (SELECT COUNT(DISTINCT recruiter_id::text) FROM job_recruiter_assignments jra WHERE jra.job_id::text = j.id::text AND jra.is_active = true) as recruiters_assigned_count,
        8 as recruiter_capacity_max,
        
        -- Hiring Progress
        COALESCE(j.number_of_openings, 1) as total_openings,
        (SELECT COUNT(*) FROM submissions WHERE job_id::text = j.id::text AND status = 'placed') as filled_positions,
        GREATEST(0, COALESCE(j.number_of_openings, 1) - (SELECT COUNT(*) FROM submissions WHERE job_id::text = j.id::text AND status = 'placed')) as remaining_positions,
        
        -- Candidate Pipeline
        (SELECT COUNT(*) FROM submissions WHERE job_id::text = j.id::text) as total_candidates,
        0 as parsed,
        0 as jd_matched,
        0 as ai_matched,
        (SELECT COUNT(*) FROM submissions WHERE job_id::text = j.id::text AND status = 'shortlisted') as shortlisted,
        (SELECT COUNT(*) FROM submissions WHERE job_id::text = j.id::text AND status = 'submitted') as submitted,
        (SELECT COUNT(*) FROM submissions WHERE job_id::text = j.id::text AND status IN ('interview_scheduled', 'interviewing', 'interview_completed')) as interviews,
        (SELECT COUNT(*) FROM submissions WHERE job_id::text = j.id::text AND status IN ('offer_extended', 'offer_accepted')) as offers,
        (SELECT COUNT(*) FROM submissions WHERE job_id::text = j.id::text AND status = 'joined') as joined,
        (SELECT COUNT(*) FROM submissions WHERE job_id::text = j.id::text AND status = 'placed') as placements
        
      FROM job_descriptions j
      LEFT JOIN clients c ON j.client_id::text = c.id::text
      LEFT JOIN users u ON j.created_by_user_id::text = u.id::text
      LEFT JOIN job_teamlead_assignments tla ON j.id::text = tla.job_id::text AND tla.is_active = true
      LEFT JOIN users tlu ON tla.team_lead_id::text = tlu.id::text
      ${whereClause}
      ORDER BY j.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    const dataValues = [...values, limit, offset];
    const dataResult = await client.query(dataQuery, dataValues);
    
    const jobs = dataResult.rows.map((job) => {
      if (job.required_skills && typeof job.required_skills === 'string') {
        job.required_skills = JSON.parse(job.required_skills);
      }
      if (job.preferred_skills && typeof job.preferred_skills === 'string') {
        job.preferred_skills = JSON.parse(job.preferred_skills);
      }
      job.recruiters_assigned_count = parseInt(job.recruiters_assigned_count) || 0;

      // -------------------------------------------------------------
      // WORKFLOW STAGE RESOLVER
      // -------------------------------------------------------------
      const stages = [
        "Waiting Team Lead Assignment",
        "Recruiter Assignment",
        "Candidate Sourcing",
        "Resume Parsing",
        "JD Matching",
        "AI Matching",
        "Shortlisted Candidates",
        "Submission",
        "Client Review",
        "Interview",
        "Offer",
        "Joining",
        "Placement"
      ];

      // Define default state
      let currentStage = "Requirement Review";
      let completedStages: string[] = [];
      let pendingStages = [...stages];
      let nextAction = "Approve Requirement";
      let nextActionRoute = null;
      let nextActionType = "NONE";
      let actionEnabled = false;
      let actionMessage = "Requirement must be approved before beginning workflow.";
      let health = "🟡 Attention Required";

      if (job.approval_status === "approved" || job.approval_status === "active" || job.recruitment_status === "active") {
        
        // Evaluate the first incomplete step
        let stepIndex = 0;
        const evaluateStep = (condition: boolean) => {
            if (condition) {
                completedStages.push(stages[stepIndex]);
                pendingStages.shift();
                stepIndex++;
                return true;
            }
            return false;
        };

        // Strict Sequential Evaluation
        evaluateStep(!!job.team_lead_id);
        if (stepIndex > 1) evaluateStep(job.recruiters_assigned_count > 0);
        if (stepIndex > 2) evaluateStep(job.total_candidates > 0);
        if (stepIndex > 3) evaluateStep(job.parsed > 0);
        if (stepIndex > 4) evaluateStep(job.jd_matched > 0);
        if (stepIndex > 5) evaluateStep(job.ai_matched > 0);
        if (stepIndex > 6) evaluateStep(job.shortlisted > 0);
        if (stepIndex > 7) evaluateStep(job.submitted > 0);
        if (stepIndex > 8) evaluateStep(job.interviews > 0);
        if (stepIndex > 9) evaluateStep(job.offers > 0);
        if (stepIndex > 10) evaluateStep(job.joined > 0);
        if (stepIndex > 11) evaluateStep(job.placements > 0);

        if (job.remaining_positions == 0) {
            stepIndex = stages.length; 
            currentStage = "Completed";
            nextAction = "None";
            nextActionType = "NONE";
            nextActionRoute = null;
            actionEnabled = false;
            actionMessage = "Placement goals met.";
            health = "🟢 Completed";
            completedStages = [...stages];
            pendingStages = [];
        } else {
            currentStage = stages[stepIndex];
            
            // Map the next action explicitly based on the resolved incomplete stage
            switch (currentStage) {
                case "Waiting Team Lead Assignment":
                    nextAction = "Assign Team Lead";
                    nextActionType = "MODAL";
                    nextActionRoute = "?action=assign_team_lead";
                    actionEnabled = true;
                    actionMessage = "";
                    health = "🟡 Attention Required";
                    break;
                case "Recruiter Assignment":
                    nextAction = "Assign Recruiters";
                    nextActionType = "PAGE";
                    nextActionRoute = "/recruitment-planning/recruiter-assignment";
                    actionEnabled = true;
                    actionMessage = "";
                    health = job.recruiters_assigned_count == 0 ? "🟡 Attention Required" : "🟢 On Track";
                    break;
                case "Candidate Sourcing":
                    nextAction = "Open Candidate Sourcing";
                    nextActionType = "PAGE";
                    nextActionRoute = "/candidate-sourcing/boolean-search";
                    actionEnabled = true;
                    actionMessage = "";
                    health = "🟢 On Track";
                    break;
                case "Resume Parsing":
                    nextAction = "Run Resume Parsing";
                    nextActionType = "PAGE";
                    nextActionRoute = "/candidate-sourcing/upload-resume";
                    actionEnabled = true;
                    actionMessage = "";
                    health = "🟢 On Track";
                    break;
                case "JD Matching":
                    nextAction = "Run JD Matching";
                    nextActionType = "PAGE";
                    nextActionRoute = "/ai-recruitment/jd-matching";
                    actionEnabled = true;
                    actionMessage = "";
                    health = "🟢 On Track";
                    break;
                case "AI Matching":
                    nextAction = "Run AI Matching";
                    nextActionType = "PAGE";
                    nextActionRoute = "/ai-recruitment/ai-matching";
                    actionEnabled = true;
                    actionMessage = "";
                    health = "🟢 On Track";
                    break;
                case "Shortlisted Candidates":
                    nextAction = "Review Shortlist";
                    nextActionType = "PAGE";
                    nextActionRoute = "/team-lead-management/shortlist-review";
                    actionEnabled = true;
                    actionMessage = "";
                    health = "🟢 On Track";
                    break;
                case "Submission":
                    nextAction = "Create Submission";
                    nextActionType = "PAGE";
                    nextActionRoute = "/team-lead-management/submission-review";
                    actionEnabled = true;
                    actionMessage = "";
                    health = "🟢 On Track";
                    break;
                case "Client Review":
                    nextAction = "View Client Review";
                    nextActionType = "PAGE";
                    nextActionRoute = "/business-development/client-submission-tracking";
                    actionEnabled = true;
                    actionMessage = "";
                    health = "🟢 On Track";
                    break;
                case "Interview":
                    nextAction = "Schedule Interview";
                    nextActionType = "PAGE";
                    nextActionRoute = "/hiring-process/interviews";
                    actionEnabled = true;
                    actionMessage = "";
                    health = "🟢 On Track";
                    break;
                case "Offer":
                    nextAction = "Generate Offer";
                    nextActionType = "PAGE";
                    nextActionRoute = "/hiring-process/offers";
                    actionEnabled = true;
                    actionMessage = "";
                    health = "🟢 On Track";
                    break;
                case "Joining":
                    nextAction = "Mark Joined";
                    nextActionType = "PAGE";
                    nextActionRoute = "/hiring-process/joining";
                    actionEnabled = true;
                    actionMessage = "";
                    health = "🟢 On Track";
                    break;
                case "Placement":
                    nextAction = "Close Job";
                    nextActionType = "MODAL";
                    nextActionRoute = "?action=close_job";
                    actionEnabled = true;
                    actionMessage = "";
                    health = "🟢 On Track";
                    break;
            }
        }

        // RBAC Filter (Role-Based Action Visibility)
        if (user && user.role) {
            const role = user.role.toLowerCase();
            // Disallow Recruiters from assigning Team Leads or Recruiters
            if (role === 'recruiter') {
                if (['Assign Team Lead', 'Assign Recruiters'].includes(nextAction)) {
                    actionEnabled = false;
                    actionMessage = "Requires Team Lead or Manager permissions.";
                }
            }
            // Disallow Team Leads from assigning Team Leads
            if (role === 'team_lead') {
                if (nextAction === 'Assign Team Lead') {
                    actionEnabled = false;
                    actionMessage = "Requires Manager permissions.";
                }
            }
        }
      } else {
         // Inactive or Draft
         currentStage = "Inactive";
         nextAction = "None";
         nextActionType = "NONE";
         nextActionRoute = null;
         actionEnabled = false;
         actionMessage = "Job is inactive or pending approval.";
         health = "🔴 Inactive";
      }

      const progressPercentage = Math.round((completedStages.length / stages.length) * 100);

      // -------------------------------------------------------------
      // BACKEND-DRIVEN AVAILABLE ACTIONS
      // -------------------------------------------------------------
      let available_actions: any[] = [];
      const userRole = user?.role?.toLowerCase() || 'unknown';
      let stepIndex = stages.indexOf(currentStage);
      if (stepIndex === -1 && currentStage === "Completed") stepIndex = stages.length;

      if (currentStage !== "Completed" && currentStage !== "Inactive" && currentStage !== "Requirement Review") {
          // =======================
          // JOBS DASHBOARD ACTIONS
          // =======================
          available_actions.push({ id: "edit_job", label: "Edit", type: "SECONDARY", enabled: true, message: "" });
          available_actions.push({ id: "close_job", label: "Close Job", type: "SECONDARY", enabled: true, message: "" });
          available_actions.push({ id: "view_progress", label: "View Progress", type: "SECONDARY", enabled: true, message: "" });

          // =======================
          // TEAM LEAD ASSIGNMENT ACTIONS
          // =======================
          if (userRole === 'manager' || userRole === 'admin') {
              if (!job.team_lead_id) {
                  available_actions.push({ id: "tl_assign", label: "Assign Team Lead", type: "PRIMARY", enabled: true, message: "" });
              } else {
                  available_actions.push({ id: "tl_reassign", label: "Reassign Team Lead", type: "PRIMARY", enabled: true, message: "" });
                  
                  // Can only remove team lead if recruitment hasn't progressed past Candidate Sourcing
                  const canRemoveTl = stepIndex <= 1; // 0 = Waiting Team Lead, 1 = Recruiter Assignment
                  available_actions.push({ 
                      id: "tl_remove", 
                      label: "Remove Team Lead", 
                      type: "DANGER", 
                      enabled: canRemoveTl, 
                      message: canRemoveTl ? "" : "Recruitment has already started. Please reassign instead." 
                  });
              }
          }

          // =======================
          // RECRUITER ASSIGNMENT ACTIONS
          // =======================
          if (userRole === 'team_lead' || userRole === 'manager' || userRole === 'admin') {
              // Wait, Recruiter Assignment requires Team Lead to be assigned first!
              if (job.team_lead_id) {
                  if (job.recruiters_assigned_count === 0) {
                      available_actions.push({ id: "rec_assign", label: "Assign Recruiters", type: "PRIMARY", enabled: true, message: "" });
                  } else {
                      available_actions.push({ id: "rec_assign_additional", label: "Assign Additional", type: "SECONDARY", enabled: true, message: "" });
                      available_actions.push({ id: "rec_manage", label: "Manage Recruiters", type: "SECONDARY", enabled: true, message: "" });
                  }
              } else {
                  available_actions.push({ id: "rec_assign", label: "Assign Recruiters", type: "PRIMARY", enabled: false, message: "A Team Lead must be assigned first." });
              }
          }
      }

      // Attach new properties to job
      job.current_recruitment_stage = currentStage;
      job.next_action = nextAction;
      job.next_action_type = nextActionType;
      job.next_action_route = nextActionRoute;
      job.action_enabled = actionEnabled;
      job.action_message = actionMessage;
      job.job_health_indicator = health;
      job.recruitment_progress_percentage = job.remaining_positions == 0 ? 100 : progressPercentage;
      job.completed_stages = completedStages;
      job.pending_stages = pendingStages;
      job.available_actions = available_actions;

      return job;
    });

    return { jobs, total };
  }
}
