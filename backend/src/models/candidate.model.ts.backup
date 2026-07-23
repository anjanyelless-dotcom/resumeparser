import { Pool } from "pg";
import { getClient } from "../database/db";

export interface Candidate {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  status?: string;
  resume_path?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CandidateWithDetails extends Candidate {
  work_history?: any[];
  education?: any[];
  certifications?: any[];
  skills?: any[];
}

export class CandidateModel {
  static async findById(id: string): Promise<CandidateWithDetails | null> {
    const client = await getClient();
    try {
      const result = await client.query(
        "SELECT * FROM candidates WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async create(data: Partial<Candidate>): Promise<Candidate> {
    const client = await getClient();
    try {
      const result = await client.query(
        "INSERT INTO candidates (email, phone, name, status) VALUES ($1, $2, $3, $4) RETURNING *",
        [data.email, data.phone, data.name, data.status || "pending"]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async update(id: string, data: Partial<Candidate>): Promise<Candidate | null> {
    const client = await getClient();
    try {
      const result = await client.query(
        "UPDATE candidates SET email = COALESCE($1, email), phone = COALESCE($2, phone), name = COALESCE($3, name), status = COALESCE($4, status), updated_at = NOW() WHERE id = $5 RETURNING *",
        [data.email, data.phone, data.name, data.status, id]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async findAll(): Promise<Candidate[]> {
    const client = await getClient();
    try {
      const result = await client.query("SELECT * FROM candidates ORDER BY created_at DESC");
      return result.rows;
    } finally {
      client.release();
    }
  }
}
