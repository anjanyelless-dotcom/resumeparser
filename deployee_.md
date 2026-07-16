























































Here is the full deployment guide based on the project files I analyzed. I have used `<...>` placeholders for values I cannot know (domain, API keys, DB password, etc.). Replace every placeholder before running the command.

## 1. Project analysis

| Component | Technology | Location / key file | Port | Notes |
|---|---|---|---|---|
| **Frontend** | React 19 + Vite + TypeScript + Tailwind | `frontend/` | `80/443` via Nginx | Build output is `frontend/dist` |
| **Backend** | Node.js 20 + Express + TypeScript | [backend/src/](cci:9://file:///Users/anjanyelle/Desktop/untitled%20folder%202/resumeparser/backend/src:0:0-0:0) | `3001` | Uses `pm2` / [ecosystem.config.js](cci:7://file:///Users/anjanyelle/Desktop/untitled%20folder%202/resumeparser/backend/src/ecosystem.config.js:0:0-0:0); entry `dist/server.js` |
| **AI service** | Python 3.10 + FastAPI + Uvicorn | `ai-service/` | `8000` | Loads DeBERTa/BERT models on first start; CPU only in this config |
| **Database** | PostgreSQL 15 | [backend/src/database/schema.sql](cci:7://file:///Users/anjanyelle/Desktop/untitled%20folder%202/resumeparser/backend/src/database/schema.sql:0:0-0:0) | `5432` | `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` are used by the backend |
| **Cache / queue** | Redis | [backend/src/queues/](cci:9://file:///Users/anjanyelle/Desktop/untitled%20folder%202/resumeparser/backend/src/queues:0:0-0:0) | `6379` | BullMQ uses it for the company-scrape worker |
| **Reverse proxy** | Nginx | `nginx/` | `80/443` | Proxies `/api/*` and `/socket.io/*` to backend, static files to `frontend/dist` |
| **Container option** | Docker + Docker Compose | `docker-compose.yml` | `80/443/3001/8000/5432` | Fully containerized alternative |

Key files that control deployment:
- [backend/src/server.ts](cci:7://file:///Users/anjanyelle/Desktop/untitled%20folder%202/resumeparser/backend/src/server.ts:0:0-0:0) — loads [.env](cci:7://file:///Users/anjanyelle/Desktop/untitled%20folder%202/resumeparser/frontend/.env:0:0-0:0) from the current working directory
- [backend/src/database/db.ts](cci:7://file:///Users/anjanyelle/Desktop/untitled%20folder%202/resumeparser/backend/src/database/db.ts:0:0-0:0) — connects via `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- [backend/src/app.ts](cci:7://file:///Users/anjanyelle/Desktop/untitled%20folder%202/resumeparser/backend/src/app.ts:0:0-0:0) — CORS uses `ALLOWED_ORIGINS`
- [backend/src/package.json](cci:7://file:///Users/anjanyelle/Desktop/untitled%20folder%202/resumeparser/backend/src/package.json:0:0-0:0) — build script is `tsc && npm run copy-js-files`
- [ai-service/main.py](cci:7://file:///Users/anjanyelle/Desktop/untitled%20folder%202/resumeparser/ai-service/main.py:0:0-0:0) — FastAPI app, starts with `uvicorn main:app`
- [frontend/.env.production](cci:7://file:///Users/anjanyelle/Desktop/untitled%20folder%202/resumeparser/frontend/.env.production:0:0-0:0) — must contain `VITE_API_URL` and `VITE_SOCKET_URL`

## 2. Values you must provide

- `<DOMAIN>` — e.g., `resume.example.com` (or your IP if you do not have a domain)
- `<DB_PASSWORD>` — strong DB password for the `resume_parser` DB user
- `<JWT_SECRET>` — `openssl rand -base64 32`
- `<GEMINI_API_KEY>` — required for experience extraction
- `<OPENAI_API_KEY>`, `<ANTHROPIC_API_KEY>`, `<DEEPSEEK_API_KEY>` — optional, only if you use those providers
- `<GEONAMES_USERNAME>` — free GeoNames username for location detection
- `<YOUR_REPO_URL>` — from `git remote -v` on your local machine (your local repo shows `git@github-anjanyelless:anjanyelless-dotcom/resumeparser.git`, so use the same URL or the HTTPS equivalent)

## 3. Connect to the server

```bash
ssh -i /path/to/your/key root@157.245.99.140
```

If DigitalOcean gave you a root password instead of an SSH key:

```bash
ssh root@157.245.99.140
```

## 4. Initial server setup

Run the next commands as [root](cci:1://file:///Users/anjanyelle/Desktop/untitled%20folder%202/resumeparser/ai-service/main.py:286:0-304:5).

```bash
# Update the system
apt update && apt upgrade -y

# Set timezone
timedatectl set-timezone UTC

# Create a deploy user (recommended)
adduser deploy --gecos ""
usermod -aG sudo deploy

# Create project directory
mkdir -p /var/www
chown deploy:deploy /var/www
```

### Swap (important for 2–4 GB RAM)

```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf
```

## 5. Install required software

### Node.js 20, PM2, Git

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git

# Verify
node -v
npm -v

npm install -g pm2
```

### PostgreSQL 15

```bash
install -d /usr/share/postgresql-common/pgdg
curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
apt update
apt install -y postgresql-15 postgresql-contrib-15
```

### Redis

```bash
apt install -y redis-server
systemctl enable --now redis-server
```

### Nginx and Certbot

```bash
apt install -y nginx certbot python3-certbot-nginx
systemctl enable --now nginx
```

### Python 3.10 and system dependencies for the AI service

```bash
apt install -y python3.10 python3.10-venv python3.10-dev python3-pip \
  build-essential tesseract-ocr tesseract-ocr-eng libgomp1 libpq-dev
```

If your droplet is Ubuntu 24.04 and `python3.10` is not available, add the deadsnakes PPA first:

```bash
apt install -y software-properties-common
add-apt-repository -y ppa:deadsnakes/ppa
apt update
apt install -y python3.10 python3.10-venv python3.10-dev python3-pip
```

### Firewall

```bash
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 22/tcp
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

## 6. Clone the repository

```bash
cd /var/www
sudo -u deploy git clone <YOUR_REPO_URL> resume-parser
cd resume-parser
```

If the repo is private and uses the `github-anjanyelless` SSH alias from your local machine, copy the SSH config to the server first, or use the HTTPS URL.

After clone, fix ownership:

```bash
chown -R deploy:deploy /var/www/resume-parser
```

## 7. PostgreSQL setup

```bash
# Create user and database
sudo -u postgres psql -c "CREATE USER resume_parser WITH PASSWORD '<DB_PASSWORD>';"
sudo -u postgres psql -c "CREATE DATABASE resume_parser OWNER resume_parser;"
sudo -u postgres psql -c "ALTER DATABASE resume_parser OWNER TO resume_parser;"
```

Apply the schema:

```bash
sudo -u postgres psql -d resume_parser -f /var/www/resume-parser/backend/src/database/schema.sql
```

Grant privileges so the app user can access tables created by postgres:

```bash
sudo -u postgres psql -d resume_parser -c "GRANT ALL ON SCHEMA public TO resume_parser;"
sudo -u postgres psql -d resume_parser -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO resume_parser;"
sudo -u postgres psql -d resume_parser -c "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO resume_parser;"
sudo -u postgres psql -d resume_parser -c "GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO resume_parser;"
sudo -u postgres psql -d resume_parser -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO resume_parser;"
sudo -u postgres psql -d resume_parser -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO resume_parser;"
```

If you need the app to create the `uuid-ossp` extension itself later, also run:

```bash
sudo -u postgres psql -d resume_parser -c "GRANT CREATE ON SCHEMA public TO resume_parser;"
```

Restart PostgreSQL:

```bash
systemctl restart postgresql
```

## 8. Backend setup

### 8.1 Environment file

Create `/var/www/resume-parser/backend/src/.env` with at least these values:

```bash
cat > /var/www/resume-parser/backend/src/.env << 'EOF'
NODE_ENV=production
PORT=3001
HOSTNAME=<DOMAIN>

# PostgreSQL (individual params are used by backend/src/database/db.ts)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=resume_parser
DB_USER=resume_parser
DB_PASSWORD=<DB_PASSWORD>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=<JWT_SECRET>
SECRET_KEY=<JWT_SECRET>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# AI service
AI_SERVICE_URL=http://127.0.0.1:8000

# CORS
ALLOWED_ORIGINS=https://<DOMAIN>
CORS_ORIGINS=https://<DOMAIN>

# Uploads
FILE_UPLOAD_PATH=./uploads
MAX_FILE_SIZE_MB=10
UPLOAD_MAX_SIZE_MB=10
STORAGE_DIR=./storage

# LLM
LLM_PROVIDER=gemini
OPENAI_API_KEY=<OPENAI_API_KEY>

# Optional external search / OCR
ENABLE_EXTERNAL_SEARCH=false
GOOGLE_CSE_API_KEY=
GOOGLE_CSE_ID=
GITHUB_TOKEN=
GEONAMES_USERNAME=<GEONAMES_USERNAME>
CLAMAV_ENABLED=false
LOG_LEVEL=INFO
EOF

chmod 600 /var/www/resume-parser/backend/src/.env
chown deploy:deploy /var/www/resume-parser/backend/src/.env
```

### 8.2 Install and build

```bash
cd /var/www/resume-parser/backend/src
sudo -u deploy mkdir -p uploads logs
sudo -u deploy npm install
sudo -u deploy npm run build
```

`npm run build` compiles TypeScript and copies `services/companyIntel/*.js` into [dist/](cci:9://file:///Users/anjanyelle/Desktop/untitled%20folder%202/resumeparser/backend/src/dist:0:0-0:0). If you later see `MODULE_NOT_FOUND` for `companyIntel/parsers/...`, also copy the subdirectory:

```bash
cp -r /var/www/resume-parser/backend/src/services/companyIntel/parsers \
       /var/www/resume-parser/backend/src/dist/services/companyIntel/
```

### 8.3 Start with PM2

```bash
cd /var/www/resume-parser/backend/src
sudo -u deploy pm2 start ecosystem.config.js --env production
```

## 9. AI service setup

### 9.1 Environment file

Create `/var/www/resume-parser/ai-service/.env`:

```bash
cat > /var/www/resume-parser/ai-service/.env << 'EOF'
PORT=8000
HOST=0.0.0.0
DEBUG=false
LOG_LEVEL=INFO

MODEL_NAME=dslim/bert-base-NER
MODEL_CACHE_DIR=/var/www/resume-parser/ai-service/models/cache
MAX_RESUME_LENGTH=5000
CONFIDENCE_THRESHOLD=0.80
DEVICE=cpu
BATCH_SIZE=8
MAX_SEQUENCE_LENGTH=512
DEBERTA_MODEL_PATH=/var/www/resume-parser/ai-service/models/cache
API_PREFIX=/api/v1
DOCS_URL=/docs
RELOAD=false
WORKERS=1
TIMEOUT=120

GEMINI_API_KEY=<GEMINI_API_KEY>
DEEPSEEK_API_KEY=<DEEPSEEK_API_KEY>
ANTHROPIC_API_KEY=<ANTHROPIC_API_KEY>
OPENAI_API_KEY=<OPENAI_API_KEY>

DB_HOST=localhost
DB_PORT=5432
DB_NAME=resume_parser
DB_USER=resume_parser
DB_PASSWORD=<DB_PASSWORD>

PYTHONUNBUFFERED=1
PYTHONDONTWRITEBYTECODE=1
TOKENIZERS_PARALLELISM=false
TRANSFORMERS_CACHE=/var/www/resume-parser/ai-service/models/cache
HF_HOME=/var/www/resume-parser/ai-service/models/cache
EOF

chmod 600 /var/www/resume-parser/ai-service/.env
chown deploy:deploy /var/www/resume-parser/ai-service/.env
sudo -u deploy mkdir -p /var/www/resume-parser/ai-service/models/cache
```

### 9.2 Create virtual environment and install Python packages

```bash
cd /var/www/resume-parser/ai-service
sudo -u deploy python3.10 -m venv venv
sudo -u deploy bash -c 'source venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt'
```

Install the spaCy language model used by several parsers:

```bash
sudo -u deploy bash -c 'cd /var/www/resume-parser/ai-service && source venv/bin/activate && python -m spacy download en_core_web_sm'
```

### 9.3 Start with PM2

```bash
cd /var/www/resume-parser/ai-service
sudo -u deploy pm2 start ./venv/bin/uvicorn --name resume-parser-ai -- main:app --host 0.0.0.0 --port 8000 --workers 1 --log-level info
```

### 9.4 Persist PM2 processes across reboots

```bash
sudo -u deploy pm2 save
pm2 startup systemd -u deploy --hp /home/deploy
systemctl daemon-reload
systemctl start pm2-deploy
```

## 10. Frontend setup

### 10.1 Environment file

Create `/var/www/resume-parser/frontend/.env.production`:

```bash
cat > /var/www/resume-parser/frontend/.env.production << 'EOF'
VITE_API_URL=https://<DOMAIN>/api
VITE_SOCKET_URL=https://<DOMAIN>
VITE_GEONAMES_USERNAME=<GEONAMES_USERNAME>
EOF
```

If you have no domain, use `http://157.245.99.140` instead of `https://<DOMAIN>`.

### 10.2 Build

```bash
cd /var/www/resume-parser/frontend
sudo -u deploy npm install
sudo -u deploy npm run build
```

The production bundle is now in `frontend/dist`.

## 11. Nginx reverse proxy

Create the site config:

```bash
cat > /etc/nginx/sites-available/resume-parser << 'EOF'
server {
    listen 80;
    server_name <DOMAIN>;

    root /var/www/resume-parser/frontend/dist;
    index index.html;

    client_max_body_size 20M;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Backend health check
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        access_log off;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Socket.io / WebSocket
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Optional: expose AI service docs /api/v1 on /ai/
    # Remove or restrict by IP in production if not needed
    location /ai/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/resume-parser /etc/nginx/sites-enabled/resume-parser

nginx -t
systemctl reload nginx
```

## 12. Enable HTTPS with Let's Encrypt

Only if you have a domain pointing to `157.245.99.140`.

```bash
certbot --nginx -d <DOMAIN> -d www.<DOMAIN>
```

Choose redirect HTTP to HTTPS when prompted. Certbot will rewrite the Nginx config automatically.

Test renewal:

```bash
certbot renew --dry-run
```

Add a cron job for auto-renewal:

```bash
(crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet && systemctl reload nginx") | crontab -
```

## 13. Verify everything is running

### System services

```bash
systemctl status postgresql
systemctl status redis-server
systemctl status nginx
systemctl status pm2-deploy
```

### PM2 processes

```bash
sudo -u deploy pm2 status
sudo -u deploy pm2 logs resume-parser-backend
sudo -u deploy pm2 logs resume-parser-ai
```

### Direct health checks

```bash
curl -s http://127.0.0.1:3001/health
curl -s http://127.0.0.1:8000/health
```

You should see JSON with status.

### Through Nginx / domain

```bash
curl -s https://<DOMAIN>/health
curl -s https://<DOMAIN>/api/auth/login   # will likely return 401/404, confirming backend reachability
```

### PostgreSQL connectivity from the app machine

```bash
sudo -u postgres psql -U resume_parser -h 127.0.0.1 -d resume_parser -c "SELECT count(*) FROM users;"
```

It will prompt for the `<DB_PASSWORD>`.

### Frontend

Open `https://<DOMAIN>` in a browser and check the browser console for API/Socket errors.

## 14. Troubleshooting commands

### Backend will not start

```bash
sudo -u deploy pm2 logs resume-parser-backend --lines 100
sudo -u deploy pm2 logs resume-parser-backend --err
cd /var/www/resume-parser/backend/src && sudo -u deploy node dist/server.js
```

### AI service will not start / OOM

```bash
sudo -u deploy pm2 logs resume-parser-ai --lines 100
free -h
swapon --show
sudo -u deploy bash -c 'cd /var/www/resume-parser/ai-service && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 --log-level debug'
```

If it runs out of memory, increase swap or upgrade the droplet to 4 GB RAM. First start downloads models and can use a lot of memory.

### Database connection error

```bash
# Test from the backend directory
cd /var/www/resume-parser/backend/src
sudo -u deploy node -e "require('./database/db').query('SELECT NOW()').then(r=>console.log(r.rows[0])).catch(e=>console.error(e))"

# Check Postgres auth
sudo -u postgres psql -c "\l"
sudo -u postgres psql -d resume_parser -c "\dn+"
grep -E "listen_addresses|port" /etc/postgresql/15/main/postgresql.conf
tail -20 /var/log/postgresql/postgresql-15-main.log
```

### 502 Bad Gateway from Nginx

```bash
nginx -t
systemctl status nginx
curl -s http://127.0.0.1:3001/health
curl -s http://127.0.0.1:8000/health
sudo -u deploy pm2 status
```

### CORS errors in the browser

Make sure `ALLOWED_ORIGINS` in [backend/src/.env](cci:7://file:///Users/anjanyelle/Desktop/untitled%20folder%202/resumeparser/backend/src/.env:0:0-0:0) matches your frontend URL, e.g. `https://<DOMAIN>`.

### `MODULE_NOT_FOUND` after backend build

```bash
cd /var/www/resume-parser/backend/src
cp -r services/companyIntel/* dist/services/companyIntel/
sudo -u deploy pm2 restart resume-parser-backend
```

### SSL certificate issues

```bash
certbot renew --dry-run
nginx -t
systemctl reload nginx
```

## 15. Docker / Docker Compose alternative

The repo already contains a working `docker-compose.yml` and Dockerfiles. This is the simplest path if you do not need PM2.

**Pros of Docker Compose:**
- One command deploys PostgreSQL, Redis, backend, AI service, and Nginx
- Isolated dependencies
- The project already has memory limits tuned for a 2 GB droplet

**Cons:**
- More disk and memory overhead
- A 2 GB droplet will be tight when AI models first load

**Quick Docker Compose route (alternative to the PM2 guide above):**

```bash
# On a fresh Ubuntu droplet after Docker + docker-compose are installed
cd /var/www/resume-parser

# Create environment
cat > .env << 'EOF'
DB_PASSWORD=<DB_PASSWORD>
JWT_SECRET=<JWT_SECRET>
GEMINI_API_KEY=<GEMINI_API_KEY>
ANTHROPIC_API_KEY=<ANTHROPIC_API_KEY>
OPENAI_API_KEY=<OPENAI_API_KEY>
DEEPSEEK_API_KEY=<DEEPSEEK_API_KEY>
EOF

# Update domain in Nginx config
sed -i 's/your-domain.com/<DOMAIN>/g' nginx/digitalocean-nginx.conf

# Build and start
docker-compose build --no-cache
docker-compose up -d
```

Then for HTTPS with Docker Nginx, install Certbot on the host, copy the generated certificates into `nginx/ssl/`, and run `docker-compose restart nginx`. This is already documented in `DIGITALOCEAN_DEPLOYMENT.md` and [deploy.sh](cci:7://file:///Users/anjanyelle/Desktop/untitled%20folder%202/resumeparser/deploy.sh:0:0-0:0).

For your current request (PM2 + system packages + Nginx), the step-by-step commands above are the recommended path.

---

**If you want me to execute this deployment live on `157.245.99.140`, provide:**
- SSH access (key or root password)
- The domain name you want to use
- Your Gemini / OpenAI / Anthropic / DeepSeek API keys
- The PostgreSQL password you want to use
- Your preferred Git clone URL

Once I have those, I can run the commands directly and hand the working server back to you.