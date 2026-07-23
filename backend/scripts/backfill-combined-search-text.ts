/**
 * Backfill Script: Populate combined_search_text column for candidates
 *
 * This script concatenates current_title, current_company, summary, and skills
 * from the candidates table into the combined_search_text column.
 *
 * Runs in batches of 100 to avoid locking the table.
 *
 * Usage:
 *   npx ts-node scripts/backfill-combined-search-text.ts
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'resume_parser',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

const BATCH_SIZE = 100;

interface Candidate {
  id: string;
  current_title?: string;
  current_company?: string;
  summary?: string;
}

interface CandidateSkill {
  skill_name: string;
}

async function getCandidateSkills(client: any, candidateId: string): Promise<CandidateSkill[]> {
  const result = await client.query(
    `SELECT s.name as skill_name 
     FROM candidate_skills cs
     JOIN skills s ON cs.skill_id = s.id
     WHERE cs.candidate_id = $1`,
    [candidateId]
  );
  return result.rows;
}

async function backfillCombinedSearchText() {
  const client = await pool.connect();

  try {
    console.log('Starting backfill of combined_search_text column...\n');

    // Get total count of candidates
    const countResult = await client.query(
      'SELECT COUNT(*) FROM candidates WHERE combined_search_text IS NULL OR combined_search_text = \'\''
    );
    const totalCount = parseInt(countResult.rows[0].count);
    console.log(`Found ${totalCount} candidates to backfill\n`);

    if (totalCount === 0) {
      console.log('No candidates need backfilling. Exiting.');
      return;
    }

    // Process in batches
    let totalUpdated = 0;
    let processed = 0;

    while (processed < totalCount) {
      // Get a batch of candidates
      const candidatesResult = await client.query(
        `SELECT id, current_title, current_company, summary 
         FROM candidates 
         WHERE combined_search_text IS NULL OR combined_search_text = ''
         ORDER BY id 
         LIMIT $1`,
        [BATCH_SIZE]
      );
      const candidates = candidatesResult.rows as Candidate[];

      console.log(`Processing batch ${Math.floor(processed / BATCH_SIZE) + 1} (${candidates.length} candidates)...`);

      for (const candidate of candidates) {
        try {
          // Get skills for this candidate
          const skills = await getCandidateSkills(client, candidate.id);
          const skillNames = skills.map((s) => s.skill_name);

          // Build combined search text
          const parts: string[] = [];
          if (candidate.current_title) parts.push(candidate.current_title);
          if (candidate.current_company) parts.push(candidate.current_company);
          if (candidate.summary) parts.push(candidate.summary);
          if (skillNames.length > 0) parts.push(skillNames.join(' '));

          const combinedText = parts.join(' ');

          // Update the candidate
          await client.query(
            'UPDATE candidates SET combined_search_text = $1 WHERE id = $2',
            [combinedText, candidate.id]
          );

          totalUpdated++;
        } catch (error: any) {
          console.error(`  Error processing candidate ${candidate.id}:`, error.message);
        }
      }

      processed += candidates.length;
      console.log(`  Updated ${totalUpdated} candidates so far\n`);
    }

    console.log(`\n✅ Backfill complete! Updated ${totalUpdated} candidates.`);

    // Verify the results
    const verifyResult = await client.query(
      'SELECT COUNT(*) FROM candidates WHERE combined_search_text IS NOT NULL AND combined_search_text != \'\''
    );
    const backfilledCount = parseInt(verifyResult.rows[0].count);
    console.log(`Total candidates with combined_search_text: ${backfilledCount}`);

  } catch (error) {
    console.error('Error during backfill:', error);
    throw error;
  } finally {
    await client.release();
  }
}

// Run the backfill
backfillCombinedSearchText()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });