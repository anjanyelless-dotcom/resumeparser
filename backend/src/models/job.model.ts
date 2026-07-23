import { PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";

export interface JobDescription {
  id?: string;
  title: string;
  description: string;
  required_skills: string[];
  department?: string;
  location?: string;
  employment_type?: string;
  min_experience_years?: number;
  max_experience_years?: number;
  education_level?: string;
  salary_min?: number;
  salary_max?: number;
  approval_status?: string;
  recruitment_status?: string;
  created_at?: Date;
  updated_at?: Date;
  client_id?: string;
  created_by_user_id?: string;

  // Custom ATS columns
  education_requirement?: string;
  seniority_level?: string;
  salary_range?: string;
  preferred_skills?: string[];
  currency?: string;
  salary_period?: string;
  work_mode?: string;
  number_of_openings?: number;
  notice_period?: string;

  // Enhanced Location fields
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
  latitude?: string;
  longitude?: string;
  location_source?: "manual" | "pincode" | "geolocation";
}

export interface JobFilter {
  search?: string;
  department?: string;
  location?: string;
  employment_type?: string;
  min_experience?: number;
  max_experience?: number;
  created_by_user_id?: string;
  status?: string;
}

export class JobModel {
  static async create(
    client: PoolClient,
    data: Partial<JobDescription>,
    userId?: string
  ): Promise<JobDescription> {
    const query = `
      INSERT INTO job_descriptions (
        id, title, department, location, employment_type, description, required_skills, 
        experience_years, education_level, min_experience_years, max_experience_years, 
        salary_min, salary_max, created_by_user_id, number_of_openings, approval_status, 
        recruitment_status, client_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING *
    `;

    const values = [
      uuidv4(),
      data.title,
      data.department,
      data.location,
      data.employment_type,
      data.description,
      JSON.stringify(data.required_skills || []),
      data.min_experience_years || 0,
      data.education_level,
      data.min_experience_years,
      data.max_experience_years,
      data.salary_min,
      data.salary_max,
      userId,
      data.number_of_openings,
      data.approval_status || 'draft',
      data.recruitment_status || 'not_started',
      data.client_id,
    ];

    const result = await client.query(query, values);
    const job = result.rows[0];

    if (job.required_skills && typeof job.required_skills === 'string') {
      job.required_skills = JSON.parse(job.required_skills);
    }
    if (job.preferred_skills && typeof job.preferred_skills === 'string') {
      job.preferred_skills = JSON.parse(job.preferred_skills);
    }

    // Populate job_skills table for matching functionality
    const requiredSkills = data.required_skills || [];
    for (const skill of requiredSkills) {
      await client.query(
        "INSERT INTO job_skills (id, job_id, skill_name, skill_type) VALUES ($1, $2, $3, $4)",
        [uuidv4(), job.id, skill, "required"]
      );
    }

    const preferredSkills = data.preferred_skills || [];
    for (const skill of preferredSkills) {
      await client.query(
        "INSERT INTO job_skills (id, job_id, skill_name, skill_type) VALUES ($1, $2, $3, $4)",
        [uuidv4(), job.id, skill, "preferred"]
      );
    }
    
    return job;
  }

  static async findAll(
    client: PoolClient,
    page: number = 1,
    limit: number = 20,
    filters: JobFilter = {},
    scopeFilter?: { sql: string; params: any[] }
  ): Promise<{ jobs: JobDescription[]; total: number }> {
    console.log("=== JobModel.findAll START ===");
    console.log("Parameters:", { page, limit, filters, scopeFilter });
    
    try {
      const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Add generic RBAC scoping
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
      
      if (scopedSql) {
        conditions.push(scopedSql);
      }
    }

    if (filters.search) {
      conditions.push(
        `(j.title ILIKE $${paramCount} OR j.description ILIKE $${paramCount})`
      );
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
      conditions.push(`j.created_by_user_id = $${paramCount}`);
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
        u.email as owner_name
      FROM job_descriptions j
      LEFT JOIN clients c ON j.client_id = c.id
      LEFT JOIN users u ON j.created_by_user_id = u.id::varchar
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
      return job;
    });

    console.log("JobModel.findAll completed, returning", jobs.length, "jobs, total:", total);
      return { jobs, total };
    } catch (error: any) {
      console.error("JobModel.findAll error:", error.message);
      console.error("Error details:", {
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        column: error.column,
        table: error.table,
        routine: error.routine,
        stack: error.stack
      });
      throw error;
    }
  }

  static async findById(
    client: PoolClient,
    id: string
  ): Promise<JobDescription | null> {
    const query = "SELECT * FROM job_descriptions WHERE id = $1";
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const job = result.rows[0];
    if (job.required_skills && typeof job.required_skills === 'string') {
      job.required_skills = JSON.parse(job.required_skills);
    }
    if (job.preferred_skills && typeof job.preferred_skills === 'string') {
      job.preferred_skills = JSON.parse(job.preferred_skills);
    }
    
    return job;
  }

  static async update(
    client: PoolClient,
    id: string,
    data: Partial<JobDescription>
  ): Promise<JobDescription | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(data.title);
      paramCount++;
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(data.description);
      paramCount++;
    }

    if (data.required_skills !== undefined) {
      updates.push(`required_skills = $${paramCount}`);
      values.push(JSON.stringify(data.required_skills));
      paramCount++;
    }

    if (data.department !== undefined) {
      updates.push(`department = $${paramCount}`);
      values.push(data.department);
      paramCount++;
    }

    if (data.location !== undefined) {
      updates.push(`location = $${paramCount}`);
      values.push(data.location);
      paramCount++;
    }

    if (data.employment_type !== undefined) {
      updates.push(`employment_type = $${paramCount}`);
      values.push(data.employment_type);
      paramCount++;
    }

    if (data.min_experience_years !== undefined) {
      updates.push(`min_experience_years = $${paramCount}`);
      values.push(data.min_experience_years);
      paramCount++;
    }

    if (data.max_experience_years !== undefined) {
      updates.push(`max_experience_years = $${paramCount}`);
      values.push(data.max_experience_years);
      paramCount++;
    }

    if (data.education_level !== undefined) {
      updates.push(`education_level = $${paramCount}`);
      values.push(data.education_level);
      paramCount++;
    }

    if (data.salary_min !== undefined) {
      updates.push(`salary_min = $${paramCount}`);
      values.push(data.salary_min);
      paramCount++;
    }

    if (data.salary_max !== undefined) {
      updates.push(`salary_max = $${paramCount}`);
      values.push(data.salary_max);
      paramCount++;
    }

    if (data.approval_status !== undefined) {
      updates.push(`approval_status = $${paramCount}`);
      values.push(data.approval_status);
      paramCount++;
    }

    if (data.recruitment_status !== undefined) {
      updates.push(`recruitment_status = $${paramCount}`);
      values.push(data.recruitment_status);
      paramCount++;
    }

    if (data.number_of_openings !== undefined) {
      updates.push(`number_of_openings = $${paramCount}`);
      values.push(data.number_of_openings);
      paramCount++;
    }

    // Enhanced location fields
    if (data.country !== undefined) {
      updates.push(`country = $${paramCount}`);
      values.push(data.country);
      paramCount++;
    }

    if (data.state !== undefined) {
      updates.push(`state = $${paramCount}`);
      values.push(data.state);
      paramCount++;
    }

    if (data.city !== undefined) {
      updates.push(`city = $${paramCount}`);
      values.push(data.city);
      paramCount++;
    }

    if (data.pincode !== undefined) {
      updates.push(`pincode = $${paramCount}`);
      values.push(data.pincode);
      paramCount++;
    }

    if (data.latitude !== undefined) {
      updates.push(`latitude = $${paramCount}`);
      values.push(data.latitude);
      paramCount++;
    }

    if (data.longitude !== undefined) {
      updates.push(`longitude = $${paramCount}`);
      values.push(data.longitude);
      paramCount++;
    }

    if (data.location_source !== undefined) {
      updates.push(`location_source = $${paramCount}`);
      values.push(data.location_source);
      paramCount++;
    }

    if (updates.length === 0) {
      return this.findById(client, id);
    }

    values.push(id);
    const query = `
      UPDATE job_descriptions
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const job = result.rows[0];
    if (job.required_skills && typeof job.required_skills === 'string') {
      job.required_skills = JSON.parse(job.required_skills);
    }
    if (job.preferred_skills && typeof job.preferred_skills === 'string') {
      job.preferred_skills = JSON.parse(job.preferred_skills);
    }

    // Sync job_skills table
    if (data.required_skills !== undefined) {
      await client.query("DELETE FROM job_skills WHERE job_id = $1 AND skill_type = 'required'", [id]);
      for (const skill of data.required_skills) {
        await client.query(
          "INSERT INTO job_skills (id, job_id, skill_name, skill_type) VALUES ($1, $2, $3, $4)",
          [uuidv4(), id, skill, "required"]
        );
      }
    }

    if (data.preferred_skills !== undefined) {
      await client.query("DELETE FROM job_skills WHERE job_id = $1 AND skill_type = 'preferred'", [id]);
      for (const skill of data.preferred_skills) {
        await client.query(
          "INSERT INTO job_skills (id, job_id, skill_name, skill_type) VALUES ($1, $2, $3, $4)",
          [uuidv4(), id, skill, "preferred"]
        );
      }
    }
    
    return job;
  }

  static async delete(client: PoolClient, id: string): Promise<boolean> {
    await client.query("DELETE FROM job_skills WHERE job_id = $1", [id]);
    const query = "DELETE FROM job_descriptions WHERE id = $1 RETURNING id";
    const result = await client.query(query, [id]);
    return result.rows.length > 0;
  }

  static async getDepartments(client: PoolClient): Promise<string[]> {
    const query = `
      SELECT DISTINCT department
      FROM job_descriptions
      WHERE department IS NOT NULL AND department != ''
      ORDER BY department
    `;
    const result = await client.query(query);
    return result.rows.map((row) => row.department);
  }

  static async getLocations(client: PoolClient): Promise<string[]> {
    const query = `
      SELECT DISTINCT location
      FROM job_descriptions
      WHERE location IS NOT NULL AND location != ''
      ORDER BY location
    `;
    const result = await client.query(query);
    return result.rows.map((row) => row.location);
  }
}
