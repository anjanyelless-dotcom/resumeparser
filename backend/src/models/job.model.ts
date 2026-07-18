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
  experience_years?: number; // legacy column kept for backwards compatibility
  education_level?: string;
  salary_min?: number;
  salary_max?: number;
  created_at?: Date;
  updated_at?: Date;
  client_id?: string;
  created_by_user_id?: string;

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
}

interface JobDescriptionsSchemaInfo {
  hasExperienceYears: boolean;
  hasMinExperienceYears: boolean;
  hasMaxExperienceYears: boolean;
  hasPreferredSkills: boolean;
  hasCurrency: boolean;
  hasSalaryPeriod: boolean;
  hasWorkMode: boolean;
  hasNumberOfOpenings: boolean;
  hasNoticePeriod: boolean;
  hasCountry: boolean;
  hasState: boolean;
  hasCity: boolean;
  hasPincode: boolean;
  hasLatitude: boolean;
  hasLongitude: boolean;
  hasLocationSource: boolean;
  hasClientId: boolean;
  hasCreatedByUserId: boolean;
  hasUpdatedByUserId: boolean;
  hasEducationRequirement: boolean;
  hasSeniorityLevel: boolean;
  hasSalaryRange: boolean;
  hasStatus: boolean;
}

let jobDescriptionsSchemaCache: JobDescriptionsSchemaInfo | null = null;

async function getJobDescriptionsSchemaInfo(
  client: PoolClient,
): Promise<JobDescriptionsSchemaInfo> {
  if (jobDescriptionsSchemaCache) return jobDescriptionsSchemaCache;
  const result = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'job_descriptions' AND table_schema = 'public'`,
  );
  const columns = result.rows.map((r) => r.column_name);
  const has = (name: string) => columns.includes(name);
  jobDescriptionsSchemaCache = {
    hasExperienceYears: has("experience_years"),
    hasMinExperienceYears: has("min_experience_years"),
    hasMaxExperienceYears: has("max_experience_years"),
    hasPreferredSkills: has("preferred_skills"),
    hasCurrency: has("currency"),
    hasSalaryPeriod: has("salary_period"),
    hasWorkMode: has("work_mode"),
    hasNumberOfOpenings: has("number_of_openings"),
    hasNoticePeriod: has("notice_period"),
    hasCountry: has("country"),
    hasState: has("state"),
    hasCity: has("city"),
    hasPincode: has("pincode"),
    hasLatitude: has("latitude"),
    hasLongitude: has("longitude"),
    hasLocationSource: has("location_source"),
    hasClientId: has("client_id"),
    hasCreatedByUserId: has("created_by_user_id"),
    hasUpdatedByUserId: has("updated_by_user_id"),
    hasEducationRequirement: has("education_requirement"),
    hasSeniorityLevel: has("seniority_level"),
    hasSalaryRange: has("salary_range"),
    hasStatus: has("status"),
  };
  return jobDescriptionsSchemaCache;
}

function skillName(skill: any): string {
  if (typeof skill === "string") return skill;
  return skill?.skill_name || skill?.name || String(skill);
}

function skillType(skill: any, fallback: string): string {
  if (typeof skill === "string") return fallback;
  return skill?.skill_type || fallback;
}

export class JobModel {
  static async create(
    client: PoolClient,
    data: Partial<JobDescription>,
    userId?: string
  ): Promise<JobDescription> {
    const schema = await getJobDescriptionsSchemaInfo(client);

    const columns: string[] = ["title", "description", "required_skills"];
    const values: any[] = [
      data.title,
      data.description,
      JSON.stringify(data.required_skills || []),
    ];

    const maybeAdd = (column: string, value: any) => {
      columns.push(column);
      values.push(value);
    };

    if (data.department !== undefined) maybeAdd("department", data.department);
    if (data.location !== undefined) maybeAdd("location", data.location);
    if (data.employment_type !== undefined) maybeAdd("employment_type", data.employment_type);

    // Experience columns: prefer min/max; keep legacy experience_years in sync if present
    if (schema.hasMinExperienceYears && data.min_experience_years !== undefined) {
      maybeAdd("min_experience_years", data.min_experience_years);
    }
    if (schema.hasMaxExperienceYears && data.max_experience_years !== undefined) {
      maybeAdd("max_experience_years", data.max_experience_years);
    }
    if (schema.hasExperienceYears) {
      const legacyExp =
        data.experience_years !== undefined
          ? data.experience_years
          : data.min_experience_years !== undefined
            ? data.min_experience_years
            : 0;
      maybeAdd("experience_years", legacyExp);
    }

    if (data.education_level !== undefined) maybeAdd("education_level", data.education_level);
    if (data.salary_min !== undefined) maybeAdd("salary_min", data.salary_min);
    if (data.salary_max !== undefined) maybeAdd("salary_max", data.salary_max);
    if (schema.hasStatus) maybeAdd("status", data.status || "active");
    if (schema.hasCreatedByUserId && userId) maybeAdd("created_by_user_id", userId);

    // Enhanced fields
    if (schema.hasPreferredSkills && data.preferred_skills !== undefined) {
      maybeAdd("preferred_skills", JSON.stringify(data.preferred_skills));
    }
    if (schema.hasCurrency && data.currency !== undefined) maybeAdd("currency", data.currency);
    if (schema.hasSalaryPeriod && data.salary_period !== undefined) maybeAdd("salary_period", data.salary_period);
    if (schema.hasWorkMode && data.work_mode !== undefined) maybeAdd("work_mode", data.work_mode);
    if (schema.hasNumberOfOpenings && data.number_of_openings !== undefined) maybeAdd("number_of_openings", data.number_of_openings);
    if (schema.hasNoticePeriod && data.notice_period !== undefined) maybeAdd("notice_period", data.notice_period);
    if (schema.hasEducationRequirement && data.education_requirement !== undefined) maybeAdd("education_requirement", data.education_requirement);
    if (schema.hasSeniorityLevel && data.seniority_level !== undefined) maybeAdd("seniority_level", data.seniority_level);
    if (schema.hasSalaryRange && data.salary_range !== undefined) maybeAdd("salary_range", data.salary_range);
    if (schema.hasClientId && data.client_id !== undefined) maybeAdd("client_id", data.client_id);

    // Location fields
    if (schema.hasCountry && data.country !== undefined) maybeAdd("country", data.country);
    if (schema.hasState && data.state !== undefined) maybeAdd("state", data.state);
    if (schema.hasCity && data.city !== undefined) maybeAdd("city", data.city);
    if (schema.hasPincode && data.pincode !== undefined) maybeAdd("pincode", data.pincode);
    if (schema.hasLatitude && data.latitude !== undefined) maybeAdd("latitude", data.latitude);
    if (schema.hasLongitude && data.longitude !== undefined) maybeAdd("longitude", data.longitude);
    if (schema.hasLocationSource && data.location_source !== undefined) maybeAdd("location_source", data.location_source);

    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    const query = `
      INSERT INTO job_descriptions (${columns.join(", ")})
      VALUES (${placeholders})
      RETURNING *
    `;

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
        [uuidv4(), job.id, skillName(skill), skillType(skill, "required")]
      );
    }

    const preferredSkills = data.preferred_skills || [];
    for (const skill of preferredSkills) {
      await client.query(
        "INSERT INTO job_skills (id, job_id, skill_name, skill_type) VALUES ($1, $2, $3, $4)",
        [uuidv4(), job.id, skillName(skill), skillType(skill, "preferred")]
      );
    }

    return job;
  }

  static async findAll(
    client: PoolClient,
    page: number = 1,
    limit: number = 20,
    filters: JobFilter = {},
    clientManagerUserId?: string
  ): Promise<{ jobs: JobDescription[]; total: number }> {
    console.log("=== JobModel.findAll START ===");
    console.log("Parameters:", { page, limit, filters, clientManagerUserId });
    
    try {
      const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Add client_manager scoping
    if (clientManagerUserId) {
      conditions.push(`client_id IN (SELECT id FROM clients WHERE owner_user_id = $${paramCount})`);
      values.push(clientManagerUserId);
      paramCount++;
    }

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
      conditions.push(`(min_experience_years IS NULL OR min_experience_years >= $${paramCount})`);
      values.push(filters.min_experience);
      paramCount++;
    }

    if (filters.max_experience !== undefined) {
      conditions.push(`(max_experience_years IS NULL OR max_experience_years <= $${paramCount})`);
      values.push(filters.max_experience);
      paramCount++;
    }

    if (filters.created_by_user_id) {
      conditions.push(`created_by_user_id = $${paramCount}`);
      values.push(filters.created_by_user_id);
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
    const schema = await getJobDescriptionsSchemaInfo(client);

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const maybeSet = (column: string, value: any) => {
      updates.push(`${column} = $${paramCount}`);
      values.push(value);
      paramCount++;
    };

    if (data.title !== undefined) maybeSet("title", data.title);
    if (data.description !== undefined) maybeSet("description", data.description);
    if (data.required_skills !== undefined) maybeSet("required_skills", JSON.stringify(data.required_skills));
    if (data.department !== undefined) maybeSet("department", data.department);
    if (data.location !== undefined) maybeSet("location", data.location);
    if (data.employment_type !== undefined) maybeSet("employment_type", data.employment_type);

    if (schema.hasMinExperienceYears && data.min_experience_years !== undefined) {
      maybeSet("min_experience_years", data.min_experience_years);
    }
    if (schema.hasMaxExperienceYears && data.max_experience_years !== undefined) {
      maybeSet("max_experience_years", data.max_experience_years);
    }
    if (schema.hasExperienceYears) {
      if (data.experience_years !== undefined) {
        maybeSet("experience_years", data.experience_years);
      } else if (data.min_experience_years !== undefined) {
        maybeSet("experience_years", data.min_experience_years);
      }
    }

    if (data.education_level !== undefined) maybeSet("education_level", data.education_level);
    if (data.salary_min !== undefined) maybeSet("salary_min", data.salary_min);
    if (data.salary_max !== undefined) maybeSet("salary_max", data.salary_max);
    if (data.status !== undefined) maybeSet("status", data.status);

    if (schema.hasPreferredSkills && data.preferred_skills !== undefined) {
      maybeSet("preferred_skills", JSON.stringify(data.preferred_skills));
    }
    if (schema.hasCurrency && data.currency !== undefined) maybeSet("currency", data.currency);
    if (schema.hasSalaryPeriod && data.salary_period !== undefined) maybeSet("salary_period", data.salary_period);
    if (schema.hasWorkMode && data.work_mode !== undefined) maybeSet("work_mode", data.work_mode);
    if (schema.hasNumberOfOpenings && data.number_of_openings !== undefined) maybeSet("number_of_openings", data.number_of_openings);
    if (schema.hasNoticePeriod && data.notice_period !== undefined) maybeSet("notice_period", data.notice_period);
    if (schema.hasEducationRequirement && data.education_requirement !== undefined) maybeSet("education_requirement", data.education_requirement);
    if (schema.hasSeniorityLevel && data.seniority_level !== undefined) maybeSet("seniority_level", data.seniority_level);
    if (schema.hasSalaryRange && data.salary_range !== undefined) maybeSet("salary_range", data.salary_range);
    if (schema.hasClientId && data.client_id !== undefined) maybeSet("client_id", data.client_id);

    if (schema.hasCountry && data.country !== undefined) maybeSet("country", data.country);
    if (schema.hasState && data.state !== undefined) maybeSet("state", data.state);
    if (schema.hasCity && data.city !== undefined) maybeSet("city", data.city);
    if (schema.hasPincode && data.pincode !== undefined) maybeSet("pincode", data.pincode);
    if (schema.hasLatitude && data.latitude !== undefined) maybeSet("latitude", data.latitude);
    if (schema.hasLongitude && data.longitude !== undefined) maybeSet("longitude", data.longitude);
    if (schema.hasLocationSource && data.location_source !== undefined) maybeSet("location_source", data.location_source);

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
          [uuidv4(), id, skillName(skill), skillType(skill, "required")]
        );
      }
    }

    if (data.preferred_skills !== undefined) {
      await client.query("DELETE FROM job_skills WHERE job_id = $1 AND skill_type = 'preferred'", [id]);
      for (const skill of data.preferred_skills) {
        await client.query(
          "INSERT INTO job_skills (id, job_id, skill_name, skill_type) VALUES ($1, $2, $3, $4)",
          [uuidv4(), id, skillName(skill), skillType(skill, "preferred")]
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
