# 🚀 Lakshya LLM Resume Parser — Complete Setup Guide

> **For anyone running this project for the first time (or fresh/from scratch)**  
> Follow every step in order. Do NOT skip steps.

---

## 📋 Table of Contents
1. [What is This Project?](#what-is-this-project)
2. [Architecture Overview](#architecture-overview)
3. [Prerequisites — Install These First](#prerequisites--install-these-first)
4. [Step 1 — Clone & Open the Project](#step-1--clone--open-the-project)
5. [Step 2 — Database Setup (PostgreSQL)](#step-2--database-setup-postgresql)
6. [Step 3 — Backend Setup (TypeScript / Node.js)](#step-3--backend-setup-typescript--nodejs)
7. [Step 4 — AI Service Setup (Python / FastAPI)](#step-4--ai-service-setup-python--fastapi)
8. [Step 5 — Frontend Setup (React / Vite)](#step-5--frontend-setup-react--vite)
9. [Step 6 — Run All Services](#step-6--run-all-services)
10. [Step 7 — Verify Everything Works](#step-7--verify-everything-works)
11. [DeBERTa Model — Where It Lives](#deberta-model--where-it-lives)
12. [Common Errors & Fixes](#common-errors--fixes)
13. [Quick Reference — Ports & URLs](#quick-reference--ports--urls)

---

## What is This Project?

An AI-powered **Resume Parser** system that:
- Uploads PDF / DOCX / TXT resumes
- Parses them using a custom-trained **DeBERTa NER model**
- Extracts: Name, Email, Phone, Skills, Work Experience, Education, etc.
- Matches candidates to Job Descriptions with scoring
- Stores everything in PostgreSQL

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser                              │
│              React/Vite Frontend                        │
│              http://localhost:5173                      │
└──────────────────────┬──────────────────────────────────┘
                       │ API calls
                       ▼
┌─────────────────────────────────────────────────────────┐
│             Backend (TypeScript / Node.js)              │
│              http://localhost:3001                      │
│     Handles: Auth, Candidates, Jobs, DB operations     │
└──────────────────────┬──────────────────────────────────┘
                       │ parse requests
                       ▼
┌─────────────────────────────────────────────────────────┐
│              AI Service (Python / FastAPI)              │
│              http://localhost:8000                      │
│     Handles: DeBERTa NER parsing, resume extraction    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                    │
│              localhost:5432/resume_parser               │
└─────────────────────────────────────────────────────────┘
```

---

## Prerequisites — Install These First

Before anything else, install these on your machine:

### 1. Node.js (v18 or above)
Download from: https://nodejs.org  
Verify: `node -v` and `npm -v`

### 2. Python 3.10 or 3.11
Download from: https://python.org  
> ⚠️ Python 3.12+ may have issues with some ML packages. **Recommended: Python 3.10 or 3.11**  
Verify: `python --version`

### 3. PostgreSQL 14 or above
Download from: https://www.postgresql.org/download/  
During install, set a **password for the `postgres` user** — you'll need it.  
Verify: `psql --version`

### 4. Git
Download from: https://git-scm.com  
Verify: `git --version`

### 5. (Optional but recommended) Tesseract OCR
For image-based PDF support:
- **Windows**: https://github.com/UB-Mannheim/tesseract/wiki → install and add to PATH
- **Mac**: `brew install tesseract`
- **Linux**: `sudo apt install tesseract-ocr`

---

## Step 1 — Clone & Open the Project

```bash
# Clone the repo
git clone https://github.com/anjanyelle/Lakshya-LLM-Resume-Parser.git

# Go into the project folder
cd Lakshya-LLM-Resume-Parser
```

You will see:
```
Lakshya-LLM-Resume-Parser/
├── frontend/        ← React app
├── backend/
│   └── src/         ← Node.js TypeScript backend
├── ai-service/      ← Python FastAPI parser
├── models/          ← DeBERTa model weights
└── data/            ← Evaluation datasets
```

---

## Step 2 — Database Setup (PostgreSQL)

> The backend uses **PostgreSQL**. You must create a database and run the schema before starting.

### 2a. Create the database

Open **pgAdmin** or run in terminal:

```sql
-- Connect to postgres as the postgres user
psql -U postgres

-- Create the database
CREATE DATABASE resume_parser;

-- Verify it was created
\l

-- Exit
\q
```

### 2b. Run the schema setup

The schema creates all 8 tables: `users`, `candidates`, `parsing_jobs`, `skills`, `work_experience`, `education`, `job_descriptions`, `match_scores`.

**Option A — via psql command line:**
```bash
psql -U postgres -d resume_parser -f backend/src/database/setup.sql
```

**Option B — via npm script (after doing Step 3a below):**
```bash
cd backend/src
npm run db:setup
```

**Option C — via pgAdmin:**
- Open pgAdmin → Connect to your server → Open Query Tool on `resume_parser` database → paste the contents of `backend/src/database/setup.sql` → Run

### 2c. Run all migrations

After the base schema, run the migration files to add all new columns:
```bash
cd backend/src
npm run db:migrate
```

This applies all 16 migration files in `backend/src/database/migrations/`.

---

## Step 3 — Backend Setup (TypeScript / Node.js)

The backend is inside `backend/src/`.

### 3a. Install dependencies

```bash
cd backend/src
npm install
```

### 3b. Create the `.env` file

```bash
# From inside backend/src/
copy .env.example .env        # Windows
# OR
cp .env.example .env          # Mac/Linux
```

Now open `backend/src/.env` and fill in your values:

```env
PORT=3001

# ── PostgreSQL Connection ────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_NAME=resume_parser
DB_USER=postgres
DB_PASSWORD=YourPostgresPasswordHere    # ← change this

DATABASE_URL=postgresql://postgres:YourPostgresPasswordHere@localhost:5432/resume_parser

# ── Security ─────────────────────────────────────────────
JWT_SECRET=some_long_random_secret_key_at_least_32_chars

# ── AI Service ───────────────────────────────────────────
AI_SERVICE_URL=http://127.0.0.1:8000

# ── File Uploads ─────────────────────────────────────────
FILE_UPLOAD_PATH=./uploads
MAX_FILE_SIZE_MB=10
NODE_ENV=development

# ── Optional: OpenAI (only needed if using GPT features) ─
OPENAI_API_KEY=your_openai_api_key_here   # leave blank if not using

# ── Other settings (keep as-is) ──────────────────────────
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
PARSING_MODE=deterministic
LLM_PROVIDER=none
OCR_MIN_TEXT_CHARS=100
OCR_MAX_PAGES=15
PDF_MAX_PAGES=50
CLAMAV_ENABLED=false
LOG_LEVEL=INFO
```

### 3c. Run DB setup via npm (alternative to Step 2b/2c)

If you haven't run setup.sql manually:
```bash
# Still inside backend/src/
npm run db:reset     # Reset (drops all tables if they exist)
npm run db:setup     # Create base tables from setup.sql
npm run db:migrate   # Apply all migrations
```

Or all at once:
```bash
npm run db:init
```

> ⚠️ `db:reset` will DROP all existing tables. Only use it if starting fresh.

---

## Step 4 — AI Service Setup (Python / FastAPI)

The AI service is inside `ai-service/`. It runs the DeBERTa NER model and handles all resume parsing.

### 4a. Create a Python virtual environment

```bash
cd ai-service

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate
```

> You should see `(venv)` in your terminal prompt after activation.

### 4b. Install Python dependencies

```bash
# Make sure you're inside ai-service/ with venv activated
pip install -r requirements.txt
```

> ⚠️ This installs `torch`, `transformers`, `spacy` and others. It can take **5–15 minutes** depending on your internet speed.

### 4c. Install spaCy language model

```bash
python -m spacy download en_core_web_sm
```

### 4d. Create the `.env` file

```bash
# Inside ai-service/
copy .env.example .env      # Windows
cp .env.example .env        # Mac/Linux
```

Open `ai-service/.env` and fill in:

```env
PORT=8000
HOST=0.0.0.0
DEBUG=false
LOG_LEVEL=INFO

# ── Model Settings ───────────────────────────────────────
MODEL_NAME=dslim/bert-base-NER
MODEL_CACHE_DIR=./models/cache
DEVICE=cpu                         # use 'cuda' if you have a GPU
BATCH_SIZE=16
MAX_SEQUENCE_LENGTH=512
MAX_RESUME_LENGTH=5000
CONFIDENCE_THRESHOLD=0.80

# ── API Settings ─────────────────────────────────────────
API_PREFIX=/api/v1
DOCS_URL=/docs
RELOAD=false
WORKERS=1
TIMEOUT=30

# ── LLM API Keys (optional, for LLM-enhanced parsing) ───
GEMINI_API_KEY=your_gemini_api_key_here      # get from ai.google.dev
DEEPSEEK_API_KEY=                            # optional
ANTHROPIC_API_KEY=                           # optional
OPENAI_API_KEY=                              # optional
```

> **Note:** The AI service works WITHOUT any LLM API keys. The DeBERTa model handles all parsing locally. LLM keys are only for the "enhanced extraction" features.

### 4e. Verify the DeBERTa model is present

```bash
# Still inside ai-service/ with venv activated
python -c "import os; print('Model exists:', os.path.exists('../models/resume-ner-deberta'))"
```

If the model is missing, the service will fall back to rule-based parsing. The model should be in one of:
- `models/resume-ner-deberta/` (root level)
- `ai-service/models/resume-ner-deberta/` (inside ai-service)

---

## Step 5 — Frontend Setup (React / Vite)

### 5a. Install dependencies

```bash
cd frontend
npm install
```

### 5b. Create the `.env` file

```bash
copy .env.example .env      # Windows
cp .env.example .env        # Mac/Linux
```

Open `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=ResumeParser AI
```

> ⚠️ Make sure `VITE_API_URL` points to the backend port (3001), not the AI service port (8000).

---

## Step 6 — Run All Services

You need **3 separate terminal windows/tabs** — one for each service.

### Terminal 1 — Start the AI Service (Python)

```bash
cd ai-service

# Activate virtual environment first!
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Start the service
python main.py
```

Expected output:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

> The first startup may take 30–60 seconds as it loads the DeBERTa model.

### Terminal 2 — Start the Backend (Node.js)

```bash
cd backend/src
npm run dev
```

Expected output:
```
🔍 DB Config: { host: 'localhost', port: 5432, ... }
✅ Database connected successfully
🚀 Server running on port 3001
```

### Terminal 3 — Start the Frontend (React)

```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v6.x.x  ready in 300 ms
➜  Local:   http://localhost:5173/
```

---

## Step 7 — Verify Everything Works

### Check AI Service health:
Open browser: http://localhost:8000/health  
Expected: `{"status": "healthy", ...}`

Also check docs: http://localhost:8000/docs ← Swagger UI

### Check Backend health:
Open browser: http://localhost:3001/health  
Expected: `{"status": "ok"}`

### Check Frontend:
Open browser: http://localhost:5173  
You should see the Login / Dashboard page.

### Create Admin User (first time only):
The database starts empty. Use the backend API to create your first user:

```bash
# Create first admin user via API (run in any terminal)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com", "password":"Admin@123", "role":"admin"}'
```

Or on Windows (PowerShell):
```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3001/api/auth/register" `
  -ContentType "application/json" `
  -Body '{"email":"admin@example.com","password":"Admin@123","role":"admin"}'
```

Then log in at http://localhost:5173 with those credentials.

---

## DeBERTa Model — Where It Lives

The custom-trained DeBERTa NER model is stored in:

```
models/
└── resume-ner-deberta/
    ├── checkpoint-4582/
    ├── checkpoint-27492/
    └── checkpoint-31416/    ← latest/best checkpoint

ai-service/
└── models/
    └── resume-ner-deberta/  ← same model, ai-service copy
```

The AI service loads the model from `../models/resume-ner-deberta` by default.

**If you need to retrain the model**, see the training scripts in:
```
ai-service/training/         ← Main training scripts
colab_training/              ← Google Colab training scripts
```

The training data (CoNLL format) is at:
```
ai-service/training/data/
├── dataset_train.conll
├── dataset_val.conll
└── dataset_test.conll
```

---

## Common Errors & Fixes

### ❌ `Database connection failed` or `ECONNREFUSED 5432`
- PostgreSQL is not running.
- **Fix**: Start PostgreSQL service.
  - Windows: Open Services → `postgresql-x64-xx` → Start
  - Mac: `brew services start postgresql`
  - Linux: `sudo systemctl start postgresql`
- Also check your `DB_PASSWORD` in `backend/src/.env` matches what you set during PostgreSQL install.

### ❌ `database "resume_parser" does not exist`
- You forgot to create the database.
- **Fix**: Run `CREATE DATABASE resume_parser;` in psql (see Step 2a).

### ❌ `relation "users" does not exist`
- Schema was not applied.
- **Fix**: Run `npm run db:setup` then `npm run db:migrate` from `backend/src/`.

### ❌ Python `ModuleNotFoundError`
- Virtual environment not activated or packages not installed.
- **Fix**: 
  ```bash
  cd ai-service
  venv\Scripts\activate        # or source venv/bin/activate
  pip install -r requirements.txt
  ```

### ❌ AI Service stuck loading / `MasterParser not initialized`
- The DeBERTa model is loading (takes 30–60s) or is missing.
- **Fix**: Wait 60 seconds after starting. If still failing, check that `models/resume-ner-deberta/` exists.

### ❌ Frontend shows `Network Error` or can't connect to backend
- Backend is not running or wrong `VITE_API_URL`.
- **Fix**: Make sure backend is running on port 3001 and `frontend/.env` has `VITE_API_URL=http://localhost:3001/api`.

### ❌ `pip install` fails on `torch` or `transformers`
- Old pip or Python version issue.
- **Fix**:
  ```bash
  pip install --upgrade pip setuptools wheel
  pip install -r requirements.txt
  ```

### ❌ `CORS error` in browser
- AI service or backend CORS config doesn't include your frontend URL.
- **Fix**: The AI service already allows `http://localhost:5173`. Make sure you're running frontend on that port.

### ❌ PDF uploads fail with OCR error
- Tesseract not installed.
- **Fix**: Install Tesseract OCR (see Prerequisites) and add it to your system PATH.

---

## Quick Reference — Ports & URLs

| Service | Port | URL | Start Command |
|---|---|---|---|
| Frontend (React) | `5173` | http://localhost:5173 | `cd frontend && npm run dev` |
| Backend (Node.js) | `3001` | http://localhost:3001 | `cd backend/src && npm run dev` |
| AI Service (Python) | `8000` | http://localhost:8000 | `cd ai-service && python main.py` |
| API Docs (Swagger) | `8000` | http://localhost:8000/docs | *(starts with AI Service)* |
| PostgreSQL DB | `5432` | `localhost:5432/resume_parser` | *(system service)* |

### Key API Endpoints

| Method | URL | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create new user |
| `POST` | `/api/auth/login` | Login → get JWT token |
| `POST` | `/api/upload/resume` | Upload and parse a resume |
| `GET` | `/api/candidates` | List all parsed candidates |
| `POST` | `/api/jobs` | Create a job description |
| `GET` | `/health` | Backend health check |
| `GET` | `http://localhost:8000/health` | AI Service health check |
| `GET` | `http://localhost:8000/docs` | AI Service Swagger API docs |

---

## Summary Checklist for Fresh Setup

```
✅ Node.js installed (v18+)
✅ Python 3.10/3.11 installed
✅ PostgreSQL installed and running
✅ Cloned the repo

✅ Database: CREATE DATABASE resume_parser
✅ Database: ran setup.sql (tables created)
✅ Database: ran all migrations

✅ backend/src: npm install
✅ backend/src: .env created with DB_PASSWORD and JWT_SECRET
✅ backend/src: npm run dev → shows port 3001

✅ ai-service: python -m venv venv && activate
✅ ai-service: pip install -r requirements.txt
✅ ai-service: python -m spacy download en_core_web_sm
✅ ai-service: .env created
✅ ai-service: python main.py → shows port 8000

✅ frontend: npm install
✅ frontend: .env created (VITE_API_URL=http://localhost:3001/api)
✅ frontend: npm run dev → shows port 5173

✅ Created first admin user via API
✅ Logged in at http://localhost:5173
```

---

*Last updated: June 2026 — Branch: `Uwanted_Clean`*
cd frontend && vercel --prod

cd /root/lakshya_resume_parsers/backend/src && npm audit fix

pm2 monit

# Restore stashed changes
cd /root/lakshya_resume_parsers
git stash pop

# Revert to previous commit
git checkout 16e94c6

# Rebuild and restart
npm install && npm run build
pm2 restart lakshya-backend lakshya-ai


# Login as recruiter
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "recruiter1@lakshya.com", "password": "your_password"}'

# Login as admin  
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin1@example.com", "password": "your_password"}'
  
# Register new recruiter
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "new.recruiter@example.com", "password": "password123", "role": "recruiter"}'



  # Register Admin User
curl -X POST 'http://localhost:3001/api/auth/register' \
  -H 'Content-Type: application/json' \
  --data-raw '{"email":"admin@test.com","password":"password123","role":"admin"}'

# Register BDM User
curl -X POST 'http://localhost:3001/api/auth/register' \
  -H 'Content-Type: application/json' \
  --data-raw '{"email":"bdm@test.com","password":"password123","role":"bdm"}'

# Register Client Manager User
curl -X POST 'http://localhost:3001/api/auth/register' \
  -H 'Content-Type: application/json' \
  --data-raw '{"email":"clientmanager@test.com","password":"password123","role":"client_manager"}'

# Register Team Lead User
curl -X POST 'http://localhost:3001/api/auth/register' \
  -H 'Content-Type: application/json' \
  --data-raw '{"email":"teamlead@test.com","password":"password123","role":"team_lead"}'

# Register Recruiter User
curl -X POST 'http://localhost:3001/api/auth/register' \
  -H 'Content-Type: application/json' \
  --data-raw '{"email":"recruiter@test.com","password":"password123","role":"recruiter"}'

  Role	Email	Password
Admin	admin@company.com	password
BDM	robert.bdm@company.com	password
Client Manager	lisa.clientmanager@company.com	password
Team Lead	mike.teamlead@company.com	password
Recruiter	john.recruiter@company.com	password
Recruiter	sarah.recruiter@company.com	password
Recruiter	emma.recruiter@company.com	password
Viewer	david.viewer@company.com	password
