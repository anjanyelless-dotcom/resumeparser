# Database

> **Single source of truth for the Resume Parser PostgreSQL schema.**

---

## Files

| File | Purpose |
|------|---------|
| `schema.sql` | ✅ **Master schema** – create everything from scratch (fresh DB) |
| `run_patch.sql` | ✅ **Live DB patch** – bring an *existing* database up to date, no data loss |
| `db.ts` | PostgreSQL connection pool (Node.js / TypeScript) |
| `migrations/` | Old migration history (kept for reference only – do **not** re-run) |

---

## Quick Start (Fresh Database)

```bash
# 1. Create the database
psql -U postgres -c "CREATE DATABASE resume_parser;"

# 2. Apply the schema
psql -U postgres -d resume_parser -f backend/src/database/schema.sql

# 3. Done! Start the backend.
```

## Apply to Existing Database (Team Pull / Friend's Machine)

```bash
# Run the patch script — idempotent, safe to run multiple times
psql -U postgres -d resume_parser -f backend/src/database/run_patch.sql
```

---

## Table Overview

### Auth & Security
| Table | Description |
|-------|-------------|
| `users` | App users (admin, recruiter, viewer) |
| `api_keys` | API key store (hashed) |
| `revoked_tokens` | JWT revocation list |
| `audit_logs` | Action log for compliance |
| `system_settings` | Key/value app config |

### Candidates
| Table | Description |
|-------|-------------|
| `candidates` | Core candidate profile (parsed from resume) |
| `work_history` | Work experience entries (1 table — was split before, now unified) |
| `education` | Education entries |
| `certifications` | Certifications |
| `candidate_achievements` | Awards / achievements |
| `corrections` | Manual field corrections by recruiters |
| `labeled_data` | Human-labeled data for model retraining |
| `duplicate_candidates` | Detected duplicate pairs + resolution status |

### Skills
| Table | Description |
|-------|-------------|
| `skills` | Global skill catalog (unique by `name`) |
| `candidate_skills` | Many-to-many: candidate ↔ skill with proficiency level |

### Jobs & Matching
| Table | Description |
|-------|-------------|
| `job_descriptions` | Job postings (single table — was split before, now unified) |
| `job_skills` | Skills extracted from job postings |
| `match_scores` | Candidate ↔ Job ATS scores (single table) |

### AI / ML Support
| Table | Description |
|-------|-------------|
| `parsing_jobs` | Resume parse job queue & status |
| `skill_suggestions` | AI-suggested new skills |
| `correction_patterns` | Patterns of common corrections |
| `correction_stats` | Aggregate correction counts |

---

## What Was Cleaned Up

| Removed / Unified | Why |
|-------------------|-----|
| `work_experience` table | Duplicate of `work_history` — code only used `work_history` |
| `jobs` table | Duplicate of `job_descriptions` — code only used `job_descriptions` |
| `jd_match_results` table | Duplicate of `match_scores` — code only used `match_scores` |
| `alembic_version` table | Python SQLAlchemy artifact — irrelevant in Node.js |
| `candidates.ssn` | Never used anywhere in the codebase |
| `candidates.years_experience` | Duplicate of `years_of_experience` |
| `candidates.current_title` | Duplicate of `current_job_title` |
| `candidates.total_experience_years` | Duplicate of `years_of_experience` |
| `candidates.years_experience_confidence` | Never used anywhere |
| `candidates.resume_path` | Duplicate of `resume_file_path` |
| `candidates.file_path` | Duplicate of `resume_file_path` |
| `skills.candidate_id` | Moved to `candidate_skills` join table |
| `skills.skill_name` | Duplicate of `skills.name` |
| Debug password logging in `db.ts` | Security: DB password was printed to console |

---

## Environment Variables

Configured in `/backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=resume_parser
DB_USER=postgres
DB_PASSWORD=your_password
```
