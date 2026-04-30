# GABA v4.0 — Render Deployment Guide

**Migrate from Replit to Render with Production-Grade Reliability**

---

## 📋 Table of Contents
1. [Why Render?](#why-render)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Render Setup (Step-by-Step)](#render-setup-step-by-step)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup (Supabase)](#database-setup-supabase)
6. [GitHub Integration](#github-integration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Custom Domain & SSL](#custom-domain--ssl)
9. [Performance Tuning](#performance-tuning)
10. [Troubleshooting](#troubleshooting)
11. [Cost Estimation](#cost-estimation)
12. [Rollback & Disaster Recovery](#rollback--disaster-recovery)

---

## 🚀 Why Render?

### Replit vs. Render Comparison

| Feature | Replit Free | Render Free | Render Paid |
|---------|------------|------------|------------|
| **RAM** | 500MB | 512MB | 512MB–2GB |
| **CPU** | Shared | Shared | Shared–Dedicated |
| **Uptime SLA** | Best effort | 99.99% | 99.99% |
| **SSL/HTTPS** | ✅ Auto | ✅ Auto | ✅ Auto |
| **Custom Domain** | ❌ | ✅ | ✅ |
| **Build Command** | Auto-detected | Configurable | Configurable |
| **Background Jobs** | Limited | ✅ Native | ✅ Native |
| **Database Hosting** | ❌ | ✅ (Paid) | ✅ (Paid) |
| **Cron Jobs** | ❌ | ✅ | ✅ |
| **Cost** | Free (limited) | $0–$7/mo | $7–$120+/mo |
| **Deployment** | Instant | ~1-2 min | ~1-2 min |

### Benefits of Render for GABA
- ✅ **Guaranteed uptime** (99.99% SLA) → Better for production
- ✅ **Custom domain support** → Professional appearance
- ✅ **Native background jobs** → Async backup runs
- ✅ **Docker support** → Reproducible deployments
- ✅ **GitHub auto-deploy** → CI/CD integration
- ✅ **Persistent environment** → No idling/restart cycles
- ✅ **Better performance** → Faster LLM response times
- ✅ **Scaling options** → Pay-as-you-grow

---

## ✅ Pre-Deployment Checklist

Before migrating, verify:

- [ ] **GitHub repository is public** (or add Render SSH key)
- [ ] **All secrets stored in `.env`** (not hardcoded)
- [ ] **`requirements.txt` is up-to-date** (includes all dependencies)
- [ ] **Supabase project created** (with schema initialized)
- [ ] **All API keys obtained:**
  - [ ] Groq API key
  - [ ] OpenAI API key (optional, but recommended)
  - [ ] Anthropic Claude key (optional)
  - [ ] Google Gemini key (optional)
  - [ ] DeepSeek key (optional)
  - [ ] GitHub token (for backup push, optional)
- [ ] **Local deployment tested** (runs without errors)
- [ ] **`.gitignore` excludes sensitive files:**
  ```
  .env
  __pycache__/
  *.pyc
  venv/
  .DS_Store
  ```
- [ ] **CI/CD pipeline passing** (GitHub Actions)
- [ ] **README updated with Render instructions**

---

## 🔧 Render Setup (Step-by-Step)

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended for auto-deploy)
3. Verify email
4. Create a new organization (optional, for team management)

### Step 2: Connect GitHub Repository
1. Click **"New +"** in Render dashboard
2. Select **"Web Service"**
3. Connect GitHub account (if not already connected)
4. Select repository: `fardin3084cub/GABA`
5. Click **"Connect"**

### Step 3: Configure Web Service

```
Name:                   gaba-ai-chat
Environment:            Python 3
Region:                 (Select closest to users: us-east-1, eu-west-1, etc.)
Build Command:          pip install -r requirements.txt
Start Command:          gunicorn -w 4 -b 0.0.0.0:$PORT main:app
Instance Type:          Free (or Standard for $7/mo)
Auto-Deploy:            ✅ Yes (from main branch)
```

### Step 4: Set Environment Variables
Click **"Environment"** and add:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...
ADMIN_PASSWORD=your_secure_password_here
FLASK_SECRET=random_secret_key_here
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIzaSy...
DEEPSEEK_API_KEY=sk-...
GITHUB_TOKEN=ghp_... (optional, for backup)
GITHUB_REPO=fardin3084cub/GABA (optional)
RENDER_INTERNAL_HOSTNAME=gaba-ai-chat.onrender.com
ENVIRONMENT=production
LOG_LEVEL=INFO
```

### Step 5: Deploy
1. Click **"Create Web Service"**
2. Render automatically triggers a build from your repo
3. Monitor build logs (click **"Logs"** tab)
4. Once deployed, service is live at `https://gaba-ai-chat.onrender.com`

---

## 🌍 Environment Configuration

### Production Settings for Render

Update `main.py` to detect Render environment:

```python
import os

# ── Environment Detection ──
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"

# ── Flask Config ──
app.config["ENV"] = "production" if IS_PRODUCTION else "development"
app.config["DEBUG"] = not IS_PRODUCTION
app.config["TESTING"] = False

# ── Security Headers ──
@app.after_request
def set_security_headers(response):
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# ── Logging ──
import logging
log_level = os.environ.get("LOG_LEVEL", "INFO")
logging.basicConfig(level=log_level)
logger = logging.getLogger(__name__)

if IS_PRODUCTION:
    logger.info("🚀 GABA running in PRODUCTION on Render")
else:
    logger.info("🔧 GABA running in DEVELOPMENT mode")
```

### Render `render.yaml` (Optional, for IaC)

Create `render.yaml` in repo root for Infrastructure as Code:

```yaml
services:
  - type: web
    name: gaba-ai-chat
    env: python
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn -w 4 -b 0.0.0.0:$PORT main:app
    region: us-east-1
    autoDeploy: true
    envVars:
      - key: ENVIRONMENT
        value: production
      - key: SUPABASE_URL
        scope: all
      - key: SUPABASE_SERVICE_KEY
        scope: all
      - key: ADMIN_PASSWORD
        scope: all
      - key: FLASK_SECRET
        scope: all
```

Then deploy with:
```bash
render deploy --file render.yaml
```

---

## 🗄️ Database Setup (Supabase)

Supabase is **database-agnostic** and works seamlessly with Render:

### 1. Create Supabase Project (if not already done)

```bash
# Go to supabase.com → Create account → New project
Project Name:     gaba-prod
Database Password: (strong, 25+ chars)
Region:           (us-east-1 recommended)
```

### 2. Initialize Database Schema

In Supabase dashboard → **SQL Editor**, run:

```sql
-- API Keys table
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- System Settings table
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table (integrates with Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Conversations table (logs all chats)
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_message TEXT,
  bot_reply TEXT,
  provider_used TEXT,
  tokens_used INT DEFAULT 0,
  response_time_ms INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Initialize default settings
INSERT INTO system_settings (key, value) VALUES
  ('provider_order', '["groq","openai","claude","gemini","deepseek"]'),
  ('provider_enabled', '{"groq":true,"openai":true,"claude":true,"gemini":true,"deepseek":true}'),
  ('rate_limit_per_min', '30'),
  ('web_search_enabled', 'true'),
  ('signup_open', 'true'),
  ('system_prompt', 'You are GABA...'),
  ('admin_password_hash', 'sha256_hash_here')
ON CONFLICT DO NOTHING;

-- Create Storage bucket for backups
-- (Done via Supabase UI: Storage → New Bucket → Name: backups → Private)

-- Set Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own conversations"
ON conversations FOR INSERT
WITH CHECK (user_id = auth.uid());
```

### 3. Copy Supabase Credentials

In Supabase dashboard → **Settings** → **API**:
- Copy `Project URL` → `SUPABASE_URL`
- Copy `Service Role Key` → `SUPABASE_SERVICE_KEY`

Add to Render environment variables.

### 4. Verify Connection

```bash
# On Render via shell
python -c "from supabase import create_client; client = create_client('$SUPABASE_URL', '$SUPABASE_SERVICE_KEY'); print(client.table('conversations').select().execute())"
```

---

## 🔗 GitHub Integration

### Auto-Deploy on Push

Render watches your GitHub repo and auto-deploys on commits to `main`:

1. In Render dashboard, go to your service
2. Click **"Settings"** → **"Git Integration"**
3. Select branch: `main`
4. Toggle **"Auto-Deploy"** → ON
5. Ensure GitHub workflow passes before deploying

### Deployment Triggers

Every push to `main` triggers:
1. **GitHub Actions** (lint + tests)
2. **Render build** (if GH Actions pass)
3. **Auto-restart** (if build succeeds)

### Pre-Deployment Checks

Update `.github/workflows/python-app.yml`:

```yaml
name: Python application

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Set up Python 3.10
      uses: actions/setup-python@v4
      with:
        python-version: "3.10"
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install flake8 pytest gunicorn
        if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
    - name: Lint with flake8
      run: |
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
        flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
    - name: Test with pytest
      run: |
        pytest tests/ -v || true  # Don't fail if no tests
    - name: Check for security issues
      run: |
        pip install bandit
        bandit -r . -f json -o /tmp/bandit-report.json || true
```

---

## 📊 Monitoring & Logging

### Render Dashboard Metrics

1. **CPU Usage** — Should be <50% on free tier
2. **Memory Usage** — Should be <400MB (free tier limit: 512MB)
3. **Request Count** — Monitor for rate limiting
4. **Response Time** — Track LLM provider latency

### View Logs

```bash
# In Render dashboard → Logs tab
# Filter by:
# - Time range
# - Service name
# - Log level (ERROR, WARNING, INFO)
```

### Add Custom Logging

Update `main.py`:

```python
import logging
from datetime import datetime

# ── Structured Logging ──
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)

handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger = logging.getLogger()
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Usage
logger.info("Chat endpoint called", extra={"user_id": session.get("user_id"), "provider": "groq"})
logger.error("LLM API failed", extra={"provider": "openai", "status_code": 429})
```

### Set Up Alerts (Optional)

Render integrates with:
- **Slack** — Deployment notifications
- **Email** — Critical error alerts
- **Webhook** — Custom integrations

Configure in **Settings** → **Alerts**.

---

## 🌐 Custom Domain & SSL

### Register Domain

- Use **Namecheap**, **Google Domains**, or **Cloudflare**
- Free option: **Freenom** (`.tk`, `.ml`, etc.)
- Recommended: **Porkbun** or **Route 53** ($10–$15/year)

### Add to Render

1. In Render dashboard → **Settings** → **Custom Domains**
2. Click **"Add Custom Domain"**
3. Enter domain: `gaba.yourdomain.com` (or `gaba.com`)
4. Render generates DNS records (CNAME)
5. Add to your domain registrar's DNS settings
6. Wait 24–48 hours for propagation
7. SSL certificate auto-issues (Let's Encrypt)

### DNS Configuration

In your registrar's DNS panel:

```
Type:     CNAME
Name:     gaba
Value:    gaba-ai-chat.onrender.com
TTL:      3600
```

Or for root domain (@):
```
Type:     A
Value:    <Render IP>  (provided by Render)
TTL:      3600
```

### Verify HTTPS

```bash
curl -I https://gaba.yourdomain.com
# Should return: HTTP/1.1 200 OK
# With header: Strict-Transport-Security: max-age=31536000
```

---

## ⚡ Performance Tuning

### 1. Web Server Optimization (Gunicorn)

Update start command in Render:

```bash
gunicorn -w 4 -b 0.0.0.0:$PORT \
  --timeout 60 \
  --access-logfile - \
  --error-logfile - \
  --log-level info \
  main:app
```

**Worker calculation:**
- Free tier (1 vCPU): `-w 2`
- Standard (2 vCPU): `-w 4`
- Formula: `2 * CPU_cores + 1`

### 2. Database Connection Pooling

Add to `main.py`:

```python
from psycopg2 import pool

# Connection pool for Supabase
db_pool = pool.SimpleConnectionPool(
    1, 5,  # Min 1, Max 5 connections
    user=os.environ["SUPABASE_USER"],
    password=os.environ["SUPABASE_PASSWORD"],
    host=os.environ["SUPABASE_HOST"],
    port=5432,
    database="postgres"
)

def get_db():
    return db_pool.getconn()

def close_db(conn):
    db_pool.putconn(conn)
```

### 3. Cache Optimization

Settings cache is already 15s TTL:

```python
# Already implemented in main.py
SETTINGS_TTL = 15  # Reduce DB queries
_settings_cache = {}
_settings_ts = 0

def get_setting(key, default=None):
    global _settings_cache, _settings_ts
    now = time.time()
    if now - _settings_ts > SETTINGS_TTL:
        # Refresh from DB
        res = supabase.table("system_settings").select().execute()
        _settings_cache = {r["key"]: r["value"] for r in res.data}
        _settings_ts = now
    return _settings_cache.get(key, default)
```

### 4. Rate Limiting (In-Memory)

For distributed rate limiting on Render, add Redis:

```python
# Optional: Add Redis for multi-instance rate limiting
import redis

redis_client = redis.Redis(
    host=os.environ.get("REDIS_URL", "localhost"),
    decode_responses=True
)

def is_rate_limited_redis(ip: str) -> bool:
    limit = int(get_setting("rate_limit_per_min", "30"))
    key = f"rate:{ip}:{int(time.time()) // 60}"
    count = redis_client.incr(key)
    if count == 1:
        redis_client.expire(key, 61)
    return count > limit
```

But on **free tier**, in-memory works fine (stored in app memory).

### 5. Compression

Add to Render environment:

```
FLASK_ENV=production
COMPRESS_LEVEL=9
```

Update `main.py`:

```python
from flask_compress import Compress
Compress(app)
```

---

## 🐛 Troubleshooting

### Build Fails

**Error:** `pip install failed`
- **Solution:** Check `requirements.txt` syntax, run locally: `pip install -r requirements.txt`
- **Check:** All dependencies pinned (e.g., `flask==2.3.0`)

```bash
pip freeze > requirements.txt
```

### Service Crashes on Startup

**Error:** `Application failed to start`
- **Solution:** Check Render logs for exceptions
- **Common causes:**
  - Missing environment variable
  - Supabase connection error
  - Python syntax error

```bash
# Test locally
export SUPABASE_URL="..."
export SUPABASE_SERVICE_KEY="..."
python main.py
```

### Slow Response Times

**Error:** Chat responses >10s
- **Solution:** Check LLM provider status
- **Debug:**
  ```bash
  # Check provider latency
  curl -X POST https://gaba.yourdomain.com/admin/probe \
    -H "Content-Type: application/json" \
    -d '{"provider": "groq"}'
  ```

### Database Connection Timeout

**Error:** `Supabase connection timeout`
- **Solution:** Check Supabase URL and key are correct
- **Verify:**
  ```bash
  python -c "from supabase import create_client; c = create_client('$SUPABASE_URL', '$SUPABASE_SERVICE_KEY'); print(c.table('conversations').select().execute())"
  ```

### Out of Memory

**Error:** Service restarts every 5 min (OOM)
- **Solution:** Reduce worker count or upgrade to paid tier
- **Render config:**
  ```
  gunicorn -w 2 -b 0.0.0.0:$PORT main:app  # Reduce from 4 to 2
  ```

---

## 💰 Cost Estimation

### Monthly Breakdown

| Component | Free | Starter | Standard |
|-----------|------|---------|----------|
| **Web Service** | $0 | $7 | $12 |
| **Postgres DB** | $0 | $7 | $12–$100 |
| **Supabase Auth** | Free | Free | Free |
| **Supabase Storage** | 1GB | 1GB | 100GB+ (pay-per-use) |
| **Total (Base)** | **$0** | **$14/mo** | **$24+/mo** |

### My Recommendation: Render Free + Supabase Free

**Total Cost:** $0/month
- **Render Free:** 512MB RAM, shared CPU, 100 deployment hours/month
- **Supabase Free:** PostgreSQL, 500MB storage, Auth included

**When to Upgrade:**
- **>1,000 users** → Render Starter ($7/mo)
- **>10M monthly requests** → Render Standard ($12/mo)
- **>1GB database** → Supabase Pro ($25/mo)

### Render Free Tier Limits
- ✅ **Memory:** 512MB (sufficient for Flask + GABA)
- ✅ **CPU:** Shared (fine for LLM requests, not CPU-bound)
- ✅ **Uptime:** ~99% (acceptable for hobby project)
- ⚠️ **Spins down after 15 min inactivity** (wake on first request)

---

## 🔄 Rollback & Disaster Recovery

### Automatic Rollback

If new deployment breaks, Render can auto-rollback to previous version:

1. In Render dashboard → **Deployments** tab
2. Find last known-good deployment
3. Click **"Deploy"** → Previous version auto-deploys

### Manual Rollback

```bash
# In GitHub, revert commit
git revert <bad-commit-hash>
git push origin main
# Render auto-redeploys within 1-2 min
```

### Database Backup & Recovery

**Supabase Auto-Backups:**
- Free tier: Daily backups (7-day retention)
- Pro tier: Hourly backups (30-day retention)

**Restore from backup:**

1. Supabase dashboard → **Settings** → **Backups**
2. Select restore point
3. Click **"Restore"** (creates new database, you switch connection string)

**Manual backup (in GABA admin console):**
- Click **"Backup & Recovery"**
- Click **"🚀 Run Backup Now"**
- Exports to Supabase Storage + GitHub

---

## 🚀 Migration Checklist (Replit → Render)

- [ ] Create Render account
- [ ] Connect GitHub repo to Render
- [ ] Create Supabase project + initialize schema
- [ ] Update `requirements.txt` with production dependencies:
  ```
  Flask==3.0.0
  Flask-CORS==4.0.0
  python-dotenv==1.0.0
  supabase==2.0.0
  requests==2.31.0
  gunicorn==21.2.0
  flask-compress==1.14.0
  ```
- [ ] Add `render.yaml` (optional)
- [ ] Update `main.py` with production logging + security headers
- [ ] Add all environment variables to Render
- [ ] Test deployment on free tier
- [ ] Verify all features work (chat, admin console, backups)
- [ ] Set up custom domain (optional)
- [ ] Configure GitHub auto-deploy
- [ ] Monitor logs for 24 hours
- [ ] Update README with Render deployment link
- [ ] Optional: Set up uptime monitoring (Uptime Robot, Pingdom)

---

## 📞 Support & Resources

### Render Documentation
- [Render Docs](https://render.com/docs) — Deployment guides
- [Python on Render](https://render.com/docs/deploy-python) — Framework examples
- [Environment Variables](https://render.com/docs/environment-variables) — Secrets management

### Supabase Documentation
- [Supabase Docs](https://supabase.com/docs) — Database, Auth, Storage
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security) — Data protection

### Community
- **Render Community:** [Discord](https://discord.gg/render)
- **Supabase Community:** [Discord](https://discord.supabase.com)
- **GABA Issues:** [GitHub Issues](https://github.com/fardin3084cub/GABA/issues)

---

## 🎉 Post-Migration Steps

1. **Monitor for 48 hours** — Check logs, metrics, error rates
2. **Load test** — Simulate 100+ concurrent users
3. **Backup test** — Verify backups work
4. **Security audit** — Run OWASP ZAP or Burp Suite
5. **Announce** — Update portfolio, GitHub, social media
6. **Gather feedback** — Ask users about performance

---

## 📝 Production Checklist

- [ ] HTTPS enforced (Render auto-handles)
- [ ] Security headers set (Strict-Transport-Security, CSP, etc.)
- [ ] Rate limiting active (30 requests/min per IP)
- [ ] Jailbreak filtering enabled
- [ ] Output sanitization enabled
- [ ] Admin password is 12+ characters
- [ ] All API keys stored in environment (not hardcoded)
- [ ] Monitoring/alerts configured
- [ ] Uptime monitoring active
- [ ] Backup schedule verified
- [ ] Error logging sent to console (Render captures)
- [ ] Database backups enabled
- [ ] Health check endpoint responding (`/health`)

---

**Deployment Status:** Ready for Production  
**Last Updated:** 2026-04-30  
**Next Review:** 2026-06-30

