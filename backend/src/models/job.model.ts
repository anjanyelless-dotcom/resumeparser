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
  created_at?: Date;
  updated_at?: Date;
  
  // Custom ATS columns
  education_requirement?: string;
  seniority_level?: string;
  salary_range?: string;
  status?: string;
  preferred_skills?: string[];
  currency?: string;
  salary_period?: string;
  work_mode?: string;
  number_of_openings?: number;
  notice_period?: string;
}

export interface JobFilter {
  search?: string;
  department?: string;
  location?: string;
  employment_type?: string;
  min_experience?: number;
  max_experience?: number;
}

export class JobModel {
  static async create(
    client: PoolClient,
    data: Partial<JobDescription>
  ): Promise<JobDescription> {
    const query = `
      INSERT INTO job_descriptions (
        title, description, required_skills, department, location,
        employment_type, min_experience_years, max_experience_years,
        education_level, salary_min, salary_max, education_requirement,
        seniority_level, salary_range, status, preferred_skills,
        currency, salary_period, work_mode, number_of_openings, notice_period
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `;

    const values = [
      data.title,
      data.description,
      JSON.stringify(data.required_skills || []),
      data.department,
      data.location,
      data.employment_type,
      data.min_experience_years,
      data.max_experience_years,
      data.education_level,
      data.salary_min,
      data.salary_max,
      data.education_requirement || null,
      data.seniority_level || null,
      data.salary_range || null,
      data.status || "active",
      JSON.stringify(data.preferred_skills || []),
      data.currency || 'USD',
      data.salary_period || 'Yearly',
      data.work_mode || null,
      data.number_of_openings || 1,
      data.notice_period || null,
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
    filters: JobFilter = {}
  ): Promise<{ jobs: JobDescription[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filters.search) {
      conditions.push(
        `(title ILIKE $${paramCount} OR description ILIKE $${paramCount})`
      );
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    if (filters.department) {
      conditions.push(`department = $${paramCount}`);
      values.push(filters.department);
      paramCount++;
    }

    if (filters.location) {
      conditions.push(`location = $${paramCount}`);
      values.push(filters.location);
      paramCount++;
    }

    if (filters.employment_type) {
      conditions.push(`employment_type = $${paramCount}`);
      values.push(filters.employment_type);
      paramCount++;
    }

    if (filters.min_experience !== undefined) {
      conditions.push(`min_experience_years >= $${paramCount}`);
      values.push(filters.min_experience);
      paramCount++;
    }

    if (filters.max_experience !== undefined) {
      conditions.push(`max_experience_years <= $${paramCount}`);
      values.push(filters.max_experience);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `SELECT COUNT(*) FROM job_descriptions ${whereClause}`;
    const countResult = await client.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT * FROM job_descriptions
      ${whereClause}
      ORDER BY created_at DESC
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

    return { jobs, total };
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

    if (data.education_requirement !== undefined) {
      updates.push(`education_requirement = $${paramCount}`);
      values.push(data.education_requirement);
      paramCount++;
    }

    if (data.seniority_level !== undefined) {
      updates.push(`seniority_level = $${paramCount}`);
      values.push(data.seniority_level);
      paramCount++;
    }

    if (data.salary_range !== undefined) {
      updates.push(`salary_range = $${paramCount}`);
      values.push(data.salary_range);
      paramCount++;
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(data.status);
      paramCount++;
    }

    if (data.preferred_skills !== undefined) {
      updates.push(`preferred_skills = $${paramCount}`);
      values.push(JSON.stringify(data.preferred_skills));
      paramCount++;
    }

    if (data.currency !== undefined) {
      updates.push(`currency = $${paramCount}`);
      values.push(data.currency);
      paramCount++;
    }

    if (data.salary_period !== undefined) {
      updates.push(`salary_period = $${paramCount}`);
      values.push(data.salary_period);
      paramCount++;
    }

    if (data.work_mode !== undefined) {
      updates.push(`work_mode = $${paramCount}`);
      values.push(data.work_mode);
      paramCount++;
    }

    if (data.number_of_openings !== undefined) {
      updates.push(`number_of_openings = $${paramCount}`);
      values.push(data.number_of_openings);
      paramCount++;
    }

    if (data.notice_period !== undefined) {
      updates.push(`notice_period = $${paramCount}`);
      values.push(data.notice_period);
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
