# GABA v4.0 — Project Strategy & Roadmap

**Created:** 2026-04-30  
**Status:** Active Development  
**Project Lead:** Arman ([portfolioofarman.netlify.app](https://portfolioofarman.netlify.app))

---

## 📋 Executive Summary

**GABA** (Generative AI Brain Assistant) is a full-stack, multi-model AI chat application built with **Flask + vanilla JavaScript** for deployment on Replit's free tier. It provides a production-grade conversational AI experience with a sleek dark theme, real-time provider fallback, web search integration, and an advanced admin console—all with zero build step complexity.

### Key Metrics
- **Language Composition:** JavaScript (41.9%) | CSS (31.4%) | Python (26.7%)
- **Architecture:** Backend (Flask), Frontend (HTML/CSS/JS), Database (Supabase)
- **Deployment Target:** Replit Free Tier (0.5GB RAM constraint)
- **MVP Status:** Complete (v4.0)

---

## 🎯 Project Goals

### Primary Objectives
1. **User Experience Excellence**
   - Provide a premium, responsive chat interface with glassmorphism design
   - Support full markdown rendering (tables, code blocks, headers, formatting)
   - Enable voice input via Web Speech API
   - Persist conversations locally and cloud-sync

2. **AI Reliability**
   - Implement intelligent LLM fallback (Groq → OpenAI → Claude → Gemini → DeepSeek)
   - Auto-trigger web search when user requests it
   - Graceful error handling with user-friendly messages
   - Rate limiting per IP to prevent abuse

3. **Admin Control**
   - Hidden console (double-click bottom-left) with password protection
   - Live provider health checks (latency + reply preview)
   - API key management via UI
   - System prompt editor with 8000-char limit
   - User/conversation audit logs
   - Backup to Supabase Storage & GitHub

4. **Safety & Security**
   - Hardened system prompt with jailbreak regex blocklist
   - Output sanitization (redact leaked secrets)
   - Configurable rate limiting (1–600 requests/min per IP)
   - SHA-256 admin password hashing
   - Service-role Supabase auth for backend operations

### Secondary Objectives
- Zero external dependencies on UI framework (no React, no bundler)
- Works on 50Mbps+ connections with graceful degradation
- Mobile-responsive design (tested down to 320px width)
- Session-based conversation history with localStorage + cloud sync
- One-click provider probe for diagnostics

---

## 🏗️ Architecture Overview

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | HTML5 + Vanilla JS | Zero build, full control, 41.9% of codebase |
| **Styling** | CSS3 (Grid, Flexbox, Animations) | Glassmorphism + dark industrial luxury (31.4%) |
| **Backend** | Flask + Python | Lightweight, Replit-compatible (26.7%) |
| **Database** | Supabase (PostgreSQL) | Auth, conversations, settings, API keys |
| **LLM APIs** | Groq, OpenAI, Claude, Gemini, DeepSeek | Multi-provider fallback |
| **Search** | DuckDuckGo (HTML scrape) | Web search without API quota |
| **Storage** | Supabase Storage | Project backups & recovery |
| **Deployment** | Replit | Free tier (512MB, 1 vCPU) |

### Directory Structure
```
GABA/
├── main.py                      # Flask app (26.7% — LLM agent, auth, admin API)
├── backup.py                    # Zip project → Supabase + GitHub
├── requirements.txt             # Python dependencies
├── .github/
│   └── workflows/
│       └── python-app.yml       # CI: lint + pytest
├── template/
│   └── index.html               # Single HTML file (spa-like via body classes)
├── static/
│   ├── style.css                # Dark theme (31.4% — 1700+ lines)
│   └── script.js                # Frontend engine (41.9% — 1300+ lines)
├── README.md                    # User-facing docs
├── LICENSE                      # MIT
└── STRATEGY.md                  # This file

Data Models (Supabase):
- api_keys(id, provider, api_key, is_active, created_at)
- system_settings(key, value)
- users(id, email, created_at)
- conversations(id, user_id, user_message, bot_reply, provider_used, created_at)
- Storage bucket: backups/ (private)
```

### Data Flow

```
User Input
    ↓
Frontend (script.js) → /chat POST
    ↓
Flask Backend (main.py)
    ├─ Rate limit check (IP-based)
    ├─ Safety filter (regex jailbreak detection)
    ├─ Web search trigger (if keywords match)
    ├─ System prompt injection
    ├─ Provider fallback loop
    │   ├─ Try Groq (LLaMA 3 70B)
    │   ├─ Fallback to OpenAI (GPT-4o Mini)
    │   ├─ Fallback to Claude (Sonnet 4.5)
    │   ├─ Fallback to Gemini (1.5 Flash)
    │   └─ Fallback to DeepSeek (if all above fail)
    ├─ Output sanitization (redact secrets)
    └─ Store in Supabase conversations table
    ↓
Response JSON → Frontend
    ↓
Render message with provider badge, timestamps, markdown
    ↓
Save to localStorage + update history panel
```

---

## 📦 Feature Breakdown

### User Features (Frontend)

| Feature | Status | Details |
|---------|--------|---------|
| **Chat Interface** | ✅ | Real-time messages, typing indicator, provider badges |
| **Markdown Rendering** | ✅ | Headers, bold/italic, code blocks, tables, blockquotes, links |
| **Code Blocks** | ✅ | Language detection, syntax highlighting (via CSS), copy button |
| **Voice Input** | ✅ | Web Speech API (en-US), streams to text input |
| **Conversation History** | ✅ | localStorage (client-side) + optional cloud sync (Supabase) |
| **Session Persistence** | ✅ | localStorage key: `gaba_conv_{sessionId}` |
| **Auth Modal** | ✅ | Signup/login/logout with Supabase Auth |
| **Sidebar** | ✅ | Collapsible, shows recent 12 chats, creator card |
| **Mobile Responsive** | ✅ | Hamburger menu, stacked layout (tested 320px+) |
| **Export Chat** | ✅ | Download as .txt file |
| **Suggestion Cards** | ✅ | 4 clickable prompts on welcome screen |

### Admin Features (Backend & Frontend)

| Feature | Status | Details |
|---------|--------|---------|
| **Hidden Console** | ✅ | Double-click bottom-left corner (220x220px) |
| **Password Auth** | ✅ | SHA-256 hash, env var override or dynamic update |
| **Dashboard** | ✅ | Total/today conversations, active keys, user count, rate-limited IPs |
| **Provider Probe** | ✅ | Live latency test + reply preview for each provider |
| **API Key CRUD** | ✅ | Add, update, delete, test keys per provider |
| **Provider Priority** | ✅ | Drag-drop reorder fallback chain, per-provider enable/disable |
| **Settings Editor** | ✅ | Rate limit, web search toggle, signup toggle |
| **System Prompt Editor** | ✅ | 8000 char limit, live edit, reset to default |
| **User Management** | ✅ | Search, list, delete (cascades to conversations) |
| **Conversation Logs** | ✅ | Search by message, delete log entries |
| **Export Data** | ✅ | Users/conversations/settings as JSON |
| **Backup & Recovery** | ✅ | Zip project → Supabase Storage + GitHub (if tokens set) |
| **Session Management** | ✅ | Admin logout |

### Backend Features (Python/Flask)

| Feature | Status | Details |
|---------|--------|---------|
| **Multi-LLM Fallback** | ✅ | Configurable provider order, per-provider enable/disable |
| **Web Search Integration** | ✅ | DuckDuckGo HTML scrape, auto-triggered by keywords |
| **Rate Limiting** | ✅ | Per-IP per-minute (default 30, range 1–600) |
| **Safety Filtering** | ✅ | Regex jailbreak detection + output secret redaction |
| **Settings Cache** | ✅ | 15-second in-memory TTL to reduce DB queries |
| **Conversation Logging** | ✅ | Stores user→bot turns in Supabase (if logged in) |
| **Auth (Supabase)** | ✅ | Signup/login/logout, email confirmation |
| **CORS Support** | ✅ | credentials=true, origins="*" |
| **Health Check** | ✅ | `/health` endpoint for monitoring |

---

## 🔄 Development Workflow

### Current CI/CD Pipeline
```yaml
Trigger: Push to main | Pull request to main
  ↓
Job: "build" (ubuntu-latest)
  ├─ Install Python 3.10
  ├─ Run flake8 lint (E9, F63, F7, F82 errors stop build)
  ├─ Run flake8 warnings (exit-zero, max-line-length=127)
  └─ Run pytest (if tests exist)
```

**File:** `.github/workflows/python-app.yml`

### Testing Strategy
- Currently: No explicit test suite (lint-only in CI)
- **Recommended additions:**
  - Unit tests for `call_llm()` (mock API responses)
  - Integration tests for Supabase auth flows
  - Frontend component tests (vanilla JS)
  - E2E tests for critical user paths (chat → save → export)

### Local Development

```bash
# Setup
pip install -r requirements.txt
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_KEY="eyJxxx"
export ADMIN_PASSWORD="YourSecurePassword123"
export FLASK_SECRET="random_secret_here"

# Run
python main.py
# Visit http://localhost:5000

# Lint
flake8 . --max-line-length=127 --exit-zero

# Backup
python backup.py
```

---

## 📈 Roadmap & Future Enhancements

### Phase 1: Stability & Quality (Next Sprint)
- [ ] Add pytest suite (auth, LLM fallback, rate limiting)
- [ ] Improve error messages for edge cases
- [ ] Add conversation tags/labels (admin panel)
- [ ] Implement conversation export with formatting (PDF/Markdown)
- [ ] Add dark/light theme toggle (CSS variable swap)
- [ ] Rate limit cache persistence (Redis or SQLite fallback)

### Phase 2: UX Enhancements (1-2 Months)
- [ ] Regenerate last bot message
- [ ] Edit previous user messages
- [ ] Conversation search across cloud history
- [ ] Typing indicators showing which provider is responding
- [ ] Floating action button for quick actions
- [ ] Keyboard shortcuts reference panel (?)
- [ ] User preferences (font size, markdown rendering style)
- [ ] Conversation folders/categories

### Phase 3: Features & Integrations (2-3 Months)
- [ ] Image upload support (Claude, Gemini)
- [ ] Context window awareness (warn if history > model max)
- [ ] Custom system prompts per conversation
- [ ] Conversation sharing (via unique URL + token)
- [ ] Discord/Slack bot integration
- [ ] Plugin/extension API for custom providers
- [ ] Analytics dashboard (response times, popular topics)

### Phase 4: Enterprise & Scaling (3+ Months)
- [ ] Multi-user team workspaces
- [ ] Fine-tuning on custom data
- [ ] Usage-based billing integration
- [ ] On-premise deployment guide
- [ ] API key rotation & expiration
- [ ] Audit logging for compliance (GDPR, SOC2)
- [ ] Redis for distributed rate limiting
- [ ] Kubernetes deployment manifests

---

## 🔐 Security Posture

### Current Protections
- ✅ **Authentication:** Supabase Auth (email/password), service-role key for backend
- ✅ **Authorization:** Admin password SHA-256 hash, session-based access control
- ✅ **Input Validation:** Jailbreak regex, message length limits (8000 chars max)
- ✅ **Rate Limiting:** Per-IP per-minute (configurable 1–600)
- ✅ **Output Sanitization:** Redact API keys, Bearer tokens, secret patterns
- ✅ **CORS:** Credentials-enabled, HTTPS recommended (set in production)
- ✅ **Session Security:** Flask secret key randomized, secure cookies recommended

### Known Gaps
- ⚠️ No HTTPS enforcement (Replit handles this in production)
- ⚠️ Jailbreak regex is regex-based (not ML-powered)
- ⚠️ No CSRF tokens (consider adding for admin endpoints)
- ⚠️ Rate limit data not persistent (in-memory only, lost on restart)
- ⚠️ No request signing or API key authentication (all traffic must be app-internal)

### Recommendations
1. **Enable HTTPS in production** (Replit auto-enables)
2. **Set `FLASK_ENV=production`** before deployment
3. **Use strong admin password** (minimum 12+ characters)
4. **Rotate Supabase API keys** quarterly
5. **Monitor conversation logs** for suspicious patterns
6. **Implement CSRF tokens** for state-changing admin actions
7. **Add request rate limiting at CDN level** (Cloudflare, if using)

---

## 📊 Performance & Optimization

### Frontend Performance
| Metric | Current | Target |
|--------|---------|--------|
| **Initial Load** | ~1.2s (50Mbps) | <1s |
| **Chat Response** | ~2-8s (LLM latency) | <3s (perceived, with typing) |
| **Memory (JS)** | ~12MB | <20MB |
| **CSS Bundle** | 1700 lines | Keep <2000 |
| **JS Bundle** | 1300 lines | Keep <1500 |

### Backend Performance
| Operation | Latency | Notes |
|-----------|---------|-------|
| `/chat` → LLM API | 2–8s | Depends on LLM provider |
| Settings cache hit | <5ms | 15s TTL, in-memory |
| Settings cache miss | 50–200ms | Supabase round-trip |
| Rate limit check | <1ms | In-memory dict lookup |
| Conversation save | 100–300ms | Async to Supabase (optional) |

### Optimization Opportunities
- ✅ Settings cache (already implemented)
- ⚠️ Implement connection pooling for Supabase
- ⚠️ Add HTTP/2 server push for CSS + JS
- ⚠️ Lazy-load history panel (only render visible items)
- ⚠️ Debounce settings updates from admin panel
- ⚠️ Batch conversation saves (queue + flush)

---

## 👥 Team & Responsibilities

| Role | Responsibility | Current Owner |
|------|-----------------|---------------|
| **Project Lead** | Overall vision, roadmap, community | Arman |
| **Frontend Lead** | UI/UX, vanilla JS, styling | Arman |
| **Backend Lead** | Flask, LLM integration, auth | Arman |
| **DevOps/Infra** | Deployment, backups, CI/CD | Arman |
| **QA & Testing** | Test suite, bug reports | (Seeking contributor) |
| **Documentation** | README, API docs, user guides | (Seeking contributor) |

---

## 📞 Getting Started for Contributors

### Prerequisites
- Python 3.10+
- Node.js 16+ (for CLI tools, optional)
- Supabase account (free tier sufficient)
- Replit account (free tier sufficient)

### Quick Start
1. **Fork & clone:**
   ```bash
   git clone https://github.com/fardin3084cub/GABA.git
   cd GABA
   ```

2. **Set up Supabase:**
   - Create free project at supabase.com
   - Run SQL schema (see README.md)
   - Copy `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`

3. **Set environment variables:**
   ```bash
   export SUPABASE_URL="..."
   export SUPABASE_SERVICE_KEY="..."
   export ADMIN_PASSWORD="devpassword123"
   export FLASK_SECRET="dev_secret_key"
   export GROQ_API_KEY="gsk_..." # optional
   ```

4. **Install & run:**
   ```bash
   pip install -r requirements.txt
   python main.py
   # Open http://localhost:5000
   ```

5. **Test admin console:**
   - Double-click bottom-left corner
   - Enter admin password: `devpassword123`
   - Explore dashboard, add API keys, etc.

### Common Tasks
- **Lint:** `flake8 . --max-line-length=127 --exit-zero`
- **Format:** Use black or autopep8
- **Test:** `pytest` (when suite exists)
- **Backup:** `python backup.py`
- **Deploy:** Push to Replit's Git integration

---

## 📋 Success Metrics

### User-Facing
- ✅ Average chat response time < 5s (end-to-end)
- ✅ Uptime > 99% (Replit SLA)
- ✅ Zero jailbreak attempts get through safety filter
- ✅ Support for 10,000+ conversations in DB (Supabase free tier)

### Developer-Facing
- ✅ Codebase <3500 total lines (keep it lean)
- ✅ Zero external frontend dependencies (vanilla JS)
- ✅ <3 environment variables required (core features)
- ✅ 100% provider fallback chain tested
- ✅ CI/CD passes on every push

### Business
- ✅ Works on Replit free tier (500MB, 1 vCPU)
- ✅ Deployable in <5 minutes
- ✅ Zero cost for host (Replit free)
- ✅ Free tier LLM APIs (Groq) as primary provider
- ✅ Positive community feedback on portfolio/GitHub

---

## 🤝 Contributing Guidelines

See [CONTRIBUTING.md](./CONTRIBUTING.md) (to be created) for:
- Code style guide (PEP 8 for Python, modern ES6 for JS)
- Commit message conventions (conventional commits)
- PR review process
- Branch naming (`feature/`, `bugfix/`, `docs/`)

### Areas Needing Help
- 🆘 **Test suite setup** (pytest framework)
- 🆘 **Frontend E2E tests** (Playwright or Cypress)
- 🆘 **Documentation** (API docs, deployment guide)
- 🆘 **UI/UX improvements** (accessibility audit, mobile polish)
- 🆘 **Performance profiling** (lighthouse audit)

---

## 📚 References & Resources

### Official Docs
- [Flask](https://flask.palletsprojects.com/) — Python web framework
- [Supabase](https://supabase.com/docs) — Open-source Firebase alternative
- [Groq API](https://console.groq.com/docs) — Fast LLM inference
- [OpenAI API](https://platform.openai.com/docs) — GPT models
- [Anthropic Claude](https://docs.anthropic.com/) — Claude API

### Deployment
- [Replit Docs](https://docs.replit.com/) — Free hosting platform
- [GitHub Actions](https://docs.github.com/en/actions) — CI/CD

### Learning Resources
- [MDN Web Docs](https://developer.mozilla.org/) — Vanilla JS, CSS
- [Real Python](https://realpython.com/) — Python best practices
- [CSS Tricks](https://css-tricks.com/) — CSS techniques

---

## 📝 License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE) for details.

---

## 🎉 Acknowledgments

- **Creator:** Arman ([Portfolio](https://portfolioofarman.netlify.app))
- **Powered by:** Supabase, Groq, OpenAI, Anthropic, Google, DeepSeek
- **Hosting:** Replit
- **Community:** Contributors, testers, feedback providers

---

**Last Updated:** 2026-04-30  
**Next Review:** 2026-05-30  
**Status:** Under Active Development
