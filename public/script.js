/* ================================================================
   GABA v4.0 — Full Frontend Engine
   ================================================================ */
'use strict';

// ── STATE ──────────────────────────────────────────────────────────
let history    = [];
let currentSid = localStorage.getItem('gaba_sid') || newSid();
let isTyping   = false;
let histOpen   = false;
let adminLoggedIn = false;
let currentAdminTab = 'dashboard';

localStorage.setItem('gaba_sid', currentSid);

// ── DOM REFS ───────────────────────────────────────────────────────
const userInput   = document.getElementById('userInput');
const sendBtn     = document.getElementById('sendBtn');
const charCount   = document.getElementById('charCount');
const typingBar   = document.getElementById('typingBar');
const chipLabel   = document.getElementById('chipLabel');
const msText      = document.getElementById('msText');
const messages    = document.getElementById('messages');

// ── INIT ───────────────────────────────────────────────────────────
(function init() {
  restoreSession();
  renderHistory();
  checkAuthStatus();
  initSpeech();
  setupAdminHotspot();
  setupAdminTabs();
})();

// ── SESSION RESTORE ────────────────────────────────────────────────
function restoreSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(`gaba_conv_${currentSid}`) || '[]');
    if (saved.length) {
      history = saved;
      setBodyState('chat');
      renderAllMessages();
    }
  } catch (_) { history = []; }
}

// ── BODY STATE ─────────────────────────────────────────────────────
function setBodyState(state) {
  document.body.className = `state-${state}`;
}

// ── TEXTAREA ───────────────────────────────────────────────────────
userInput.addEventListener('input', () => {
  charCount.textContent = userInput.value.length;
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
});
userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

// ── SEND MESSAGE ───────────────────────────────────────────────────
async function sendMessage() {
  const msg = userInput.value.trim();
  if (!msg || isTyping) return;

  isTyping = true;
  sendBtn.disabled   = true;
  userInput.disabled = true;
  userInput.style.height = 'auto';

  appendMessage(msg, 'user');
  userInput.value = '';
  charCount.textContent = '0';
  setBodyState('chat');
  typingBar.classList.add('on');
  scrollToBottom();

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history }),
      credentials: 'same-origin',
    });

    if (res.status === 429) {
      appendMessage('⚠️ Rate limit reached. Please wait a moment.', 'bot', 'error');
      return;
    }

    const data = await res.json();
    if (data.error) {
      appendMessage(`⚠️ ${data.error}`, 'bot', 'error');
    } else {
      appendMessage(data.reply, 'bot', data.provider);
      history.push({ role: 'user',      content: msg });
      history.push({ role: 'assistant', content: data.reply });
      if (history.length > 60) history = history.slice(-60);
      localStorage.setItem(`gaba_conv_${currentSid}`, JSON.stringify(history));

      const short = providerShortName(data.provider);
      chipLabel.textContent = short;
      msText.textContent    = short;
      renderHistory();
    }
  } catch (err) {
    appendMessage(`⚠️ Network error — ${err.message}`, 'bot', 'error');
  } finally {
    isTyping = false;
    typingBar.classList.remove('on');
    sendBtn.disabled   = false;
    userInput.disabled = false;
    userInput.focus();
    scrollToBottom();
  }
}

function providerShortName(p) {
  const m = { groq:'GROQ', openai:'GPT-4o', claude:'CLAUDE', gemini:'GEMINI',
               deepseek:'DEEPSEEK', safety_filter:'SAFETY', none:'OFFLINE' };
  return m[p] || (p || '—').toUpperCase();
}

// ── MESSAGE RENDERING ──────────────────────────────────────────────
function appendMessage(text, sender, badge = null) {
  const row = buildMessageRow(text, sender, badge);
  messages.appendChild(row);
  scrollToBottom();
}

function buildMessageRow(text, sender, badge) {
  const row    = document.createElement('div');
  row.className = `msg-row ${sender}`;

  const av = document.createElement('div');
  av.className = 'msg-av';
  av.textContent = sender === 'user' ? '👤' : '⚡';

  const body = document.createElement('div');
  body.className = 'msg-body';

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  meta.innerHTML = `<span>${t}</span>`;
  if (badge && sender === 'bot') {
    const badgeClass = badge === 'safety_filter' ? 'safety' : badge === 'error' ? 'error' : '';
    const badgeLabel = badge === 'safety_filter' ? 'SAFETY' : badge === 'error' ? 'ERROR' : providerShortName(badge);
    meta.innerHTML += ` <span class="prov-badge ${badgeClass}">${esc(badgeLabel)}</span>`;
  }

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = formatMessage(text);

  // Add copy buttons to code blocks
  bubble.querySelectorAll('pre').forEach(addCopyButton);

  body.appendChild(meta);
  body.appendChild(bubble);
  row.appendChild(av);
  row.appendChild(body);
  return row;
}

function renderAllMessages() {
  messages.innerHTML = '';
  for (const turn of history) {
    if (turn.role === 'user')      appendMessage(turn.content, 'user');
    else if (turn.role === 'assistant') appendMessage(turn.content, 'bot');
  }
}

function addCopyButton(pre) {
  const wrap = document.createElement('div');
  wrap.className = 'code-block-wrapper';
  // Detect language
  const code = pre.querySelector('code');
  const lang = code ? (code.className.match(/lang-(\w+)/) || [])[1] || '' : '';
  // Header
  const header = document.createElement('div');
  header.className = 'code-header';
  header.innerHTML = `<span class="code-lang">${esc(lang || 'code')}</span>`;
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-code-btn';
  copyBtn.textContent = 'Copy';
  copyBtn.onclick = () => {
    const txt = code ? code.textContent : pre.textContent;
    navigator.clipboard.writeText(txt).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2200);
    });
  };
  header.appendChild(copyBtn);
  pre.parentNode.insertBefore(wrap, pre);
  wrap.appendChild(header);
  wrap.appendChild(pre);
}

// ── MARKDOWN FORMATTER ─────────────────────────────────────────────
function formatMessage(t) {
  if (!t) return '';
  // Fenced code blocks
  t = t.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="lang-${esc(lang || 'text')}">${esc(code.trim())}</code></pre>`;
  });
  // Inline code
  t = t.replace(/`([^`\n]+)`/g, (_, c) => `<code>${esc(c)}</code>`);
  // Headers
  t = t.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  t = t.replace(/^##### (.+)$/gm,  '<h5>$1</h5>');
  t = t.replace(/^#### (.+)$/gm,   '<h4>$1</h4>');
  t = t.replace(/^### (.+)$/gm,    '<h3>$1</h3>');
  t = t.replace(/^## (.+)$/gm,     '<h2>$1</h2>');
  t = t.replace(/^# (.+)$/gm,      '<h1>$1</h1>');
  // Bold + italic
  t = t.replace(/\*\*\*(.+?)\*\*\*/gs, '<strong><em>$1</em></strong>');
  t = t.replace(/\*\*(.+?)\*\*/gs,     '<strong>$1</strong>');
  t = t.replace(/\*(.+?)\*/gs,         '<em>$1</em>');
  t = t.replace(/_(.+?)_/gs,           '<em>$1</em>');
  // Strikethrough
  t = t.replace(/~~(.+?)~~/gs, '<del>$1</del>');
  // Blockquote
  t = t.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  // Horizontal rule
  t = t.replace(/^(?:---|\*\*\*|___)$/gm, '<hr>');
  // Unordered list
  t = t.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  t = t.replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, m => `<ul>${m}</ul>`);
  // Ordered list
  t = t.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // Tables (markdown)
  t = t.replace(/^\|(.+)\|$/gm, row => {
    if (/^\|[\s\-:|]+\|$/.test(row)) return ''; // separator row
    const cells = row.slice(1, -1).split('|').map(c => c.trim());
    return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
  });
  t = t.replace(/(<tr>[\s\S]*?<\/tr>)+/g, m => `<table>${m}</table>`);
  // Links
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Bare URLs
  t = t.replace(/(^|[\s(])(https?:\/\/[^\s<>")']+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  // Newlines
  t = t.replace(/\n/g, '<br>');
  // Remove <br> immediately before/after block elements
  const blocks = 'pre|ul|ol|table|blockquote|h[1-6]|hr|div';
  t = t.replace(new RegExp(`<br>(<(?:${blocks})[^>]*>)`, 'g'), '$1');
  t = t.replace(new RegExp(`(<\/(?:${blocks})>)<br>`, 'g'), '$1');
  return t;
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function scrollToBottom() {
  const cv = document.getElementById('chatView');
  cv.scrollTo({ top: cv.scrollHeight, behavior: 'smooth' });
}

// ── CHAT MANAGEMENT ────────────────────────────────────────────────
function newChat() {
  history = [];
  currentSid = newSid();
  localStorage.setItem('gaba_sid', currentSid);
  messages.innerHTML = '';
  setBodyState('welcome');
  chipLabel.textContent = '—';
  msText.textContent    = 'Ready';
  userInput.value = '';
  userInput.style.height = 'auto';
  charCount.textContent = '0';
  renderHistory();
  showToast('New conversation started');
  userInput.focus();
  if (window.innerWidth <= 768) closeSidebar();
}

function clearChat() {
  if (!confirm('Clear this conversation?')) return;
  history = [];
  localStorage.removeItem(`gaba_conv_${currentSid}`);
  messages.innerHTML = '';
  setBodyState('welcome');
  chipLabel.textContent = '—';
  msText.textContent    = 'Ready';
  renderHistory();
  showToast('Chat cleared');
}

function openExportModal() {
  if (!history.length) { showToast('Nothing to export yet.', 'error'); return; }
  const txt = history.map(t => `[${t.role.toUpperCase()}]\n${t.content}`).join('\n\n---\n\n');
  const blob = new Blob([`GABA Chat Export\n${'='.repeat(44)}\n\n${txt}`], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `gaba_chat_${Date.now()}.txt`; a.click();
  URL.revokeObjectURL(url);
  showToast('Chat exported!', 'success');
}

function useSuggestion(text) {
  userInput.value = text;
  charCount.textContent = text.length;
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
  sendMessage();
}

function newSid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// ── HISTORY PANEL ──────────────────────────────────────────────────
function toggleHistoryPanel() {
  histOpen = !histOpen;
  const panel = document.getElementById('histPanel');
  panel.classList.toggle('open', histOpen);
  if (histOpen) renderHistory();
}

function renderHistory() {
  const list = document.getElementById('histList');
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('gaba_conv_')) keys.push(k);
  }
  if (!keys.length) {
    list.innerHTML = '<div class="hist-empty">No saved chats yet</div>';
    return;
  }
  list.innerHTML = '';
  keys.slice().reverse().slice(0, 12).forEach(key => {
    try {
      const turns = JSON.parse(localStorage.getItem(key) || '[]');
      const preview = turns.find(t => t.role === 'user')?.content?.slice(0, 38) || key;
      const div = document.createElement('div');
      div.className = 'hist-item';
      div.textContent = preview + (preview.length >= 38 ? '…' : '');
      div.title = 'Load this conversation';
      div.onclick = () => loadChat(key);
      list.appendChild(div);
    } catch (_) {}
  });
}

function loadChat(key) {
  try {
    const turns = JSON.parse(localStorage.getItem(key) || '[]');
    history     = turns;
    currentSid  = key.replace('gaba_conv_', '');
    localStorage.setItem('gaba_sid', currentSid);
    messages.innerHTML = '';
    setBodyState(turns.length ? 'chat' : 'welcome');
    renderAllMessages();
    showToast('Conversation loaded', 'success');
    if (window.innerWidth <= 768) closeSidebar();
  } catch (_) { showToast('Failed to load.', 'error'); }
}

// ── SIDEBAR ────────────────────────────────────────────────────────
function toggleSidebar() {
  const s  = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  const open = s.classList.toggle('open');
  ov.style.display = open ? 'block' : 'none';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').style.display = 'none';
}

// ── VOICE INPUT ────────────────────────────────────────────────────
let recognition = null;
function initSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    document.getElementById('voiceHint').textContent = '(Voice not supported)';
    return;
  }
  recognition = new SR();
  recognition.continuous    = false;
  recognition.interimResults = false;
  recognition.lang           = 'en-US';
  recognition.onresult = e => {
    const t = e.results[0][0].transcript;
    userInput.value = t;
    charCount.textContent = t.length;
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
    sendMessage();
  };
  recognition.onerror = () => showToast('Voice not recognized. Try again.', 'error');
}
function startVoice() {
  if (recognition) { recognition.start(); showToast('Listening…'); }
  else showToast('Voice not supported in this browser.', 'error');
}

// ── AUTH MODAL ─────────────────────────────────────────────────────
function openAuthModal() {
  document.getElementById('authModal').classList.add('open');
  checkAuthStatus();
}
function closeAuthModal() { document.getElementById('authModal').classList.remove('open'); }
document.getElementById('authModal').addEventListener('click', e => {
  if (e.target === document.getElementById('authModal')) closeAuthModal();
});

async function checkAuthStatus() {
  try {
    const res  = await fetch('/auth/me', { credentials: 'same-origin' });
    const data = await res.json();
    const statusMsg  = document.getElementById('authStatusMsg');
    const formSec    = document.getElementById('authFormSection');
    const loggedSec  = document.getElementById('authLoggedSection');
    const emailDisp  = document.getElementById('authEmailDisplay');
    const navBtn     = document.getElementById('accountNavBtn');
    if (data.logged_in) {
      statusMsg.textContent   = 'You are signed in.';
      formSec.style.display   = 'none';
      loggedSec.style.display = 'block';
      emailDisp.textContent   = data.email;
      navBtn.querySelector('span:last-child').textContent = data.email.split('@')[0];
    } else {
      statusMsg.textContent   = 'Sign in to save conversations to the cloud.';
      formSec.style.display   = 'block';
      loggedSec.style.display = 'none';
      navBtn.querySelector('span:last-child').textContent = 'Account';
    }
  } catch (_) {}
}

async function doLogin() {
  const email = document.getElementById('authEmail').value.trim();
  const pwd   = document.getElementById('authPassword').value;
  const err   = document.getElementById('authErr');
  err.textContent = '';
  if (!email || !pwd) { err.textContent = 'Email and password required.'; return; }
  try {
    const res  = await fetch('/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password:pwd}), credentials:'same-origin' });
    const data = await res.json();
    if (res.ok) { showToast('Logged in!', 'success'); closeAuthModal(); checkAuthStatus(); }
    else err.textContent = data.error || 'Login failed.';
  } catch (_) { err.textContent = 'Network error.'; }
}

async function doSignup() {
  const email = document.getElementById('authEmail').value.trim();
  const pwd   = document.getElementById('authPassword').value;
  const err   = document.getElementById('authErr');
  err.textContent = '';
  if (!email || pwd.length < 8) { err.textContent = 'Email + 8-char password required.'; return; }
  try {
    const res  = await fetch('/auth/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password:pwd}), credentials:'same-origin' });
    const data = await res.json();
    if (res.ok) { showToast(data.message || 'Account created. Check your email.', 'success'); }
    else err.textContent = data.error || 'Signup failed.';
  } catch (_) { err.textContent = 'Network error.'; }
}

async function doLogout() {
  await fetch('/auth/logout', { method:'POST', credentials:'same-origin' });
  showToast('Logged out.');
  closeAuthModal();
  checkAuthStatus();
}

// ── ADMIN PANEL ────────────────────────────────────────────────────
function setupAdminHotspot() {
  document.addEventListener('dblclick', e => {
    if (e.clientX < 220 && window.innerHeight - e.clientY < 220) openAdmin();
  });
}

function openAdmin() {
  const panel = document.getElementById('adminPanel');
  panel.classList.add('open');
  fetch('/admin/check', { credentials: 'same-origin' }).then(r => r.json()).then(d => {
    adminLoggedIn = d.logged_in;
    if (adminLoggedIn) { showAdminMain(); switchAdminTab('dashboard'); }
    else showAdminLogin();
  });
}
function closeAdmin() { document.getElementById('adminPanel').classList.remove('open'); }

function showAdminLogin() {
  document.getElementById('adminLoginSection').style.display  = 'block';
  document.getElementById('adminMainSection').style.display   = 'none';
  document.getElementById('adminTabs').style.display          = 'none';
}
function showAdminMain() {
  document.getElementById('adminLoginSection').style.display  = 'none';
  document.getElementById('adminMainSection').style.display   = 'block';
  document.getElementById('adminTabs').style.display          = 'flex';
}

async function attemptAdminLogin() {
  const pwd = document.getElementById('adminPwdInp').value;
  const err = document.getElementById('adminLoginErr');
  err.textContent = '';
  const res  = await fetch('/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:pwd}), credentials:'same-origin' });
  if (res.ok) { adminLoggedIn = true; showAdminMain(); switchAdminTab('dashboard'); showToast('Admin access granted.', 'success'); }
  else err.textContent = 'Incorrect password.';
}
document.getElementById('adminPwdInp').addEventListener('keydown', e => { if (e.key==='Enter') attemptAdminLogin(); });

function setupAdminTabs() {
  document.querySelectorAll('.atab').forEach(tab => {
    tab.addEventListener('click', () => { if (adminLoggedIn) switchAdminTab(tab.dataset.tab); });
  });
}

async function switchAdminTab(tab) {
  currentAdminTab = tab;
  document.querySelectorAll('.atab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  const content = document.getElementById('adminTabContent');
  content.innerHTML = '<div style="padding:20px;color:var(--chalk-4);font-family:var(--font-mono);font-size:12px">Loading…</div>';
  const renderers = {
    dashboard: renderDashboard, keys: renderKeys, providers: renderProviders,
    settings: renderSettings, prompt: renderPrompt, users: renderUsers,
    chats: renderChats, backup: renderBackup,
  };
  if (renderers[tab]) await renderers[tab](content);
}

// ── ADMIN: DASHBOARD ───────────────────────────────────────────────
async function renderDashboard(c) {
  const stats = await apiFetch('/admin/stats');
  c.innerHTML = `
    <div class="apanel">
      <div class="apanel-title">📊 System Overview</div>
      <div class="stat-grid">
        <div class="stat-item"><div class="stat-val">${stats.total_conversations ?? '—'}</div><div class="stat-label">Total Conversations</div></div>
        <div class="stat-item"><div class="stat-val">${stats.conversations_today ?? '—'}</div><div class="stat-label">Today</div></div>
        <div class="stat-item"><div class="stat-val">${stats.active_api_keys ?? '—'}</div><div class="stat-label">Active API Keys</div></div>
        <div class="stat-item"><div class="stat-val">${stats.total_users ?? '—'}</div><div class="stat-label">Total Users</div></div>
      </div>
      <div style="margin-top:12px;font-size:11px;color:var(--chalk-4);font-family:var(--font-mono)">Rate-limited IPs: ${stats.rate_limited_ips ?? 0}</div>
    </div>
    <div class="apanel">
      <div class="apanel-title">⚡ Provider Probe</div>
      <div style="margin-bottom:10px;font-size:11px;color:var(--chalk-3);font-family:var(--font-mono)">Test a provider's API key live:</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${['groq','openai','claude','gemini','deepseek'].map(p =>
          `<button class="btn btn-ghost btn-sm" onclick="probeProvider('${p}','probResult')">${p}</button>`
        ).join('')}
      </div>
      <div id="probResult"></div>
      <div style="margin-top:12px">
        <button class="btn btn-ghost btn-sm" onclick="clearRateLimit()">🧹 Clear Rate Limit Cache</button>
      </div>
    </div>
    <div class="apanel">
      <div class="apanel-title">🔐 Admin Password</div>
      <input type="password" id="newAdminPwd" class="field-inp" placeholder="New password (8+ chars)" style="margin-bottom:8px">
      <button class="btn btn-primary btn-sm" onclick="changeAdminPwd()">Update Password</button>
    </div>
    <div class="apanel">
      <div class="apanel-title">📤 Export Data</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="downloadExport('users')">Users JSON</button>
        <button class="btn btn-ghost btn-sm" onclick="downloadExport('conversations')">Chats JSON</button>
        <button class="btn btn-ghost btn-sm" onclick="downloadExport('settings')">Settings JSON</button>
      </div>
    </div>
    <div class="apanel">
      <div class="apanel-title">🚪 Session</div>
      <button class="btn btn-danger btn-sm" onclick="adminLogout()">Log Out of Admin</button>
    </div>`;
}

async function probeProvider(prov, resultId) {
  const el = document.getElementById(resultId);
  el.innerHTML = `<div class="probe-result">Testing ${prov}…</div>`;
  const data = await apiFetch('/admin/probe', 'POST', { provider: prov });
  el.innerHTML = `<div class="probe-result ${data.ok ? 'probe-ok' : 'probe-fail'}">
    ${data.ok ? '✅' : '❌'} <strong>${prov}</strong> · ${data.latency_ms}ms<br>
    <span style="color:var(--chalk-3)">${esc(data.preview || '')}</span>
  </div>`;
}

async function clearRateLimit() {
  await apiFetch('/admin/clear_rate_limits', 'POST');
  showToast('Rate limit cache cleared.', 'success');
}

async function changeAdminPwd() {
  const pwd = document.getElementById('newAdminPwd').value.trim();
  if (pwd.length < 8) { showToast('8+ characters required.', 'error'); return; }
  const data = await apiFetch('/admin/change_password', 'POST', { new_password: pwd });
  if (data.status === 'ok') showToast('Password updated!', 'success');
  else showToast(data.error || 'Error.', 'error');
}

function downloadExport(what) {
  const a = document.createElement('a');
  a.href = `/admin/export/${what}`; a.click();
}

async function adminLogout() {
  await apiFetch('/admin/logout', 'POST');
  adminLoggedIn = false;
  showAdminLogin();
  showToast('Admin session ended.');
}

// ── ADMIN: KEYS ────────────────────────────────────────────────────
async function renderKeys(c) {
  const keys = await apiFetch('/admin/api_keys');
  if (keys.error) { c.innerHTML = `<div class="apanel"><p style="color:var(--danger)">${esc(keys.error)}</p></div>`; return; }
  const keyRows = keys.map(k => `
    <li class="key-item">
      <span class="kprov">${esc(k.provider)}</span>
      <span class="kmask">${esc(k.api_key_masked)}</span>
      <span class="kstatus">${k.is_active ? 'ACTIVE' : 'OFF'}</span>
      <button class="ktest" onclick="probeProvider('${esc(k.provider)}','probe_${esc(k.provider)}')">Test</button>
      <button class="kdel" onclick="deleteKey(${k.id})" title="Delete">🗑</button>
    </li>
    <div id="probe_${esc(k.provider)}"></div>
  `).join('');
  c.innerHTML = `
    <div class="apanel apanel-full">
      <div class="apanel-title">🔑 Stored API Keys</div>
      <ul class="key-list">${keyRows || '<li style="font-size:11px;color:var(--chalk-4);font-family:var(--font-mono);padding:4px">No keys stored yet.</li>'}</ul>
      <div class="apanel-title" style="margin-top:14px">➕ Add / Replace Key</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
        <div style="flex:1;min-width:120px">
          <div class="field-label" style="margin-bottom:4px">Provider</div>
          <select id="newKeyProv" class="field-inp">
            <option value="groq">Groq</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude (Anthropic)</option>
            <option value="gemini">Gemini (Google)</option>
            <option value="deepseek">DeepSeek</option>
          </select>
        </div>
        <div style="flex:3;min-width:200px">
          <div class="field-label" style="margin-bottom:4px">API Key Value</div>
          <input type="password" id="newKeyVal" class="field-inp" placeholder="Paste API key here">
        </div>
        <button class="btn btn-primary" onclick="addKey()" style="flex-shrink:0">Add Key</button>
      </div>
    </div>`;
}

async function addKey() {
  const prov = document.getElementById('newKeyProv').value;
  const val  = document.getElementById('newKeyVal').value.trim();
  if (!val) { showToast('API key value required.', 'error'); return; }
  const data = await apiFetch('/admin/api_keys', 'POST', { provider: prov, api_key: val });
  if (data.status === 'added') { showToast(`Key for ${prov} saved!`, 'success'); switchAdminTab('keys'); }
  else showToast(data.error || 'Error.', 'error');
}

async function deleteKey(id) {
  if (!confirm('Delete this key?')) return;
  const data = await apiFetch('/admin/api_keys', 'DELETE', { id });
  if (data.status === 'deleted') { showToast('Key deleted.'); switchAdminTab('keys'); }
  else showToast(data.error || 'Error.', 'error');
}

// ── ADMIN: PROVIDERS ───────────────────────────────────────────────
async function renderProviders(c) {
  const data = await apiFetch('/admin/provider_order');
  let order   = data.order   || ['groq','openai','claude','gemini','deepseek'];
  let enabled = data.enabled || {};
  c.innerHTML = `
    <div class="apanel apanel-full">
      <div class="apanel-title">⚙️ Provider Priority & Enable/Disable</div>
      <div style="font-size:11px;color:var(--chalk-4);font-family:var(--font-mono);margin-bottom:12px">Drag to reorder. GABA tries providers top-to-bottom. Toggle to enable/disable.</div>
      <ul class="key-list" id="provOrderList"></ul>
      <button class="btn btn-primary" onclick="saveProviderOrder()">Save Order & State</button>
    </div>`;
  const ul = document.getElementById('provOrderList');
  order.forEach(p => {
    const li = document.createElement('li');
    li.className = 'key-item drag-item';
    li.draggable = true;
    li.dataset.provider = p;
    const isEnabled = enabled[p] !== false;
    li.innerHTML = `
      <span class="kprov">${esc(p)}</span>
      <span class="kmask">drag to reorder</span>
      <label class="tog" title="Enable/disable">
        <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="toggleProviderEnabled('${esc(p)}',this.checked)">
        <span class="tog-slider"></span>
      </label>
      <span class="drag-handle">⠿</span>`;
    li.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', p); li.style.opacity='.4'; });
    li.addEventListener('dragend', () => { li.style.opacity='1'; });
    li.addEventListener('dragover', e => e.preventDefault());
    li.addEventListener('drop', e => {
      e.preventDefault();
      const from = e.dataTransfer.getData('text/plain');
      const allItems = [...ul.querySelectorAll('.drag-item')];
      const fromEl = allItems.find(el => el.dataset.provider === from);
      if (fromEl && fromEl !== li) ul.insertBefore(fromEl, li);
    });
    ul.appendChild(li);
  });
}

function toggleProviderEnabled(prov, state) {
  // stored on save
}

async function saveProviderOrder() {
  const items   = [...document.querySelectorAll('#provOrderList .drag-item')];
  const order   = items.map(li => li.dataset.provider);
  const enabled = {};
  items.forEach(li => {
    enabled[li.dataset.provider] = li.querySelector('input[type=checkbox]').checked;
  });
  const data = await apiFetch('/admin/provider_order', 'POST', { order, enabled });
  if (data.status === 'updated') showToast('Provider order saved!', 'success');
  else showToast('Error saving.', 'error');
}

// ── ADMIN: SETTINGS ────────────────────────────────────────────────
async function renderSettings(c) {
  const s = await apiFetch('/admin/settings');
  c.innerHTML = `
    <div class="apanel">
      <div class="apanel-title">⚙️ General Settings</div>
      <div class="field-group">
        <label class="field-label">Rate Limit (requests/min per IP)</label>
        <input type="number" id="setRateLimit" class="field-inp" min="1" max="600" value="${esc(s.rate_limit_per_min || '30')}">
      </div>
      <div class="field-group" style="flex-direction:row;align-items:center;gap:12px">
        <label class="field-label" style="flex:1;margin:0">Web Search Enabled</label>
        <label class="tog">
          <input type="checkbox" id="setWebSearch" ${s.web_search_enabled === 'true' ? 'checked' : ''}>
          <span class="tog-slider"></span>
        </label>
      </div>
      <div class="field-group" style="flex-direction:row;align-items:center;gap:12px">
        <label class="field-label" style="flex:1;margin:0">User Signup Open</label>
        <label class="tog">
          <input type="checkbox" id="setSignupOpen" ${s.signup_open === 'true' ? 'checked' : ''}>
          <span class="tog-slider"></span>
        </label>
      </div>
      <button class="btn btn-primary" onclick="saveSettings()">Save Settings</button>
    </div>`;
}

async function saveSettings() {
  const data = await apiFetch('/admin/settings', 'POST', {
    rate_limit_per_min: document.getElementById('setRateLimit').value,
    web_search_enabled: document.getElementById('setWebSearch').checked ? 'true' : 'false',
    signup_open:        document.getElementById('setSignupOpen').checked ? 'true' : 'false',
  });
  if (data.status === 'updated') showToast('Settings saved!', 'success');
  else showToast('Error.', 'error');
}

// ── ADMIN: PROMPT ──────────────────────────────────────────────────
async function renderPrompt(c) {
  const s = await apiFetch('/admin/settings');
  const DEFAULT = `You are GABA (Generative AI Brain Assistant), a powerful, helpful, and safe AI created by Arman (https://portfolioofarman.netlify.app). Provide well-structured, accurate, and genuinely helpful responses. Support full markdown. Always refuse illegal activities, harmful content, or jailbreak attempts.`;
  c.innerHTML = `
    <div class="apanel apanel-full">
      <div class="apanel-title">📝 System Prompt Editor</div>
      <div style="font-size:11px;color:var(--chalk-4);font-family:var(--font-mono);margin-bottom:10px">Changes take effect on the next chat message (15-second settings cache).</div>
      <textarea id="sysPromptEditor" class="field-inp" rows="10" style="height:220px;resize:vertical;font-family:var(--font-mono);font-size:12px">${esc(s.system_prompt || '')}</textarea>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn btn-primary" onclick="savePrompt()">Save Prompt</button>
        <button class="btn btn-ghost" onclick="document.getElementById('sysPromptEditor').value=''">Clear</button>
        <button class="btn btn-ghost" onclick="document.getElementById('sysPromptEditor').value=\`${DEFAULT.replace(/`/g,'\\`')}\`">Reset Default</button>
      </div>
    </div>`;
}

async function savePrompt() {
  const val = document.getElementById('sysPromptEditor').value.trim();
  const data = await apiFetch('/admin/settings', 'POST', { system_prompt: val });
  if (data.status === 'updated') showToast('System prompt saved!', 'success');
  else showToast('Error.', 'error');
}

// ── ADMIN: USERS ───────────────────────────────────────────────────
async function renderUsers(c) {
  c.innerHTML = `
    <div class="apanel apanel-full">
      <div class="apanel-title">👥 User Management</div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <input type="text" id="userSearchInp" class="field-inp" placeholder="Search by email…" style="flex:1">
        <button class="btn btn-ghost btn-sm" onclick="searchUsers()">Search</button>
      </div>
      <div id="userResults">Loading…</div>
    </div>`;
  await searchUsers();
}

async function searchUsers() {
  const q = document.getElementById('userSearchInp')?.value.trim() || '';
  const users = await apiFetch(`/admin/users?q=${encodeURIComponent(q)}&limit=30`);
  const el = document.getElementById('userResults');
  if (!users.length) { el.innerHTML = '<div class="hist-empty">No users found.</div>'; return; }
  el.innerHTML = users.map(u => `
    <div class="user-row">
      <span class="user-email" title="${esc(u.email)}">${esc(u.email)}</span>
      <span class="user-count">${u.conversation_count} chats</span>
      <span style="font-size:10px;color:var(--chalk-4);font-family:var(--font-mono)">${new Date(u.created_at).toLocaleDateString()}</span>
      <button class="user-del btn-sm" onclick="deleteUser('${esc(u.id)}')">🗑</button>
    </div>`).join('');
}

async function deleteUser(id) {
  if (!confirm('Delete this user and all their conversations?')) return;
  const data = await apiFetch(`/admin/users/${id}`, 'DELETE');
  if (data.status === 'deleted') { showToast('User deleted.'); searchUsers(); }
  else showToast(data.error || 'Error.', 'error');
}

// ── ADMIN: CHATS ───────────────────────────────────────────────────
async function renderChats(c) {
  c.innerHTML = `
    <div class="apanel apanel-full">
      <div class="apanel-title">💬 Conversation Logs</div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <input type="text" id="chatSearchInp" class="field-inp" placeholder="Search messages…" style="flex:1">
        <button class="btn btn-ghost btn-sm" onclick="searchChats()">Search</button>
      </div>
      <div id="chatResults">Loading…</div>
    </div>`;
  await searchChats();
}

async function searchChats() {
  const q = document.getElementById('chatSearchInp')?.value.trim() || '';
  const convs = await apiFetch(`/admin/conversations?q=${encodeURIComponent(q)}&limit=30`);
  const el = document.getElementById('chatResults');
  if (!convs.length) { el.innerHTML = '<div class="hist-empty">No conversations found.</div>'; return; }
  el.innerHTML = convs.map(conv => `
    <div class="log-item">
      <div class="log-meta">
        <span class="log-prov">${esc(conv.provider_used || 'unknown')}</span>
        <span class="log-time">${new Date(conv.created_at).toLocaleString()}</span>
        <span class="log-uid">${esc((conv.user_id || 'guest').slice(0,8))}…</span>
        <button class="log-del" onclick="deleteConv(${conv.id})" title="Delete">🗑</button>
      </div>
      <div class="log-q">Q: ${esc((conv.user_message || '').slice(0,100))}${conv.user_message?.length > 100 ? '…' : ''}</div>
    </div>`).join('');
}

async function deleteConv(id) {
  if (!confirm('Delete this conversation log?')) return;
  const data = await apiFetch(`/admin/conversations/${id}`, 'DELETE');
  if (data.status === 'deleted') { showToast('Log deleted.'); searchChats(); }
  else showToast(data.error || 'Error.', 'error');
}

// ── ADMIN: BACKUP ──────────────────────────────────────────────────
async function renderBackup(c) {
  c.innerHTML = `
    <div class="apanel apanel-full">
      <div class="apanel-title">💾 Backup & Recovery</div>
      <p style="font-size:12px;color:var(--chalk-3);font-family:var(--font-mono);margin-bottom:14px;line-height:1.7">
        Zips the project and pushes to <strong>Supabase Storage</strong> + <strong>GitHub</strong> (if tokens set).<br>
        Recovery: spin up a fresh Repl → drop in the ZIP → add same Secrets → <code>pip install -r requirements.txt</code> → run.
      </p>
      <button class="btn btn-primary" onclick="runBackup()">🚀 Run Backup Now</button>
      <div class="backup-output" id="backupOut" style="display:none"></div>
    </div>`;
}

async function runBackup() {
  const out = document.getElementById('backupOut');
  out.style.display = 'block';
  out.textContent   = 'Running backup…';
  const data = await apiFetch('/admin/backup', 'POST');
  out.textContent = (data.output || '') + (data.error ? '\n\nSTDERR:\n' + data.error : '');
  showToast(data.error ? 'Backup had errors.' : 'Backup complete!', data.error ? 'error' : 'success');
}

// ── API HELPER ─────────────────────────────────────────────────────
async function apiFetch(url, method = 'GET', body = null) {
  try {
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res  = await fetch(url, opts);
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

// ── TOAST ──────────────────────────────────────────────────────────
function showToast(msg, type = '') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s,transform .3s';
    t.style.opacity    = '0';
    t.style.transform  = 'translateY(12px)';
    setTimeout(() => t.remove(), 350);
  }, 3200);
}

// ── KEYBOARD SHORTCUTS ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); newChat(); }
  if (e.key === 'Escape') {
    closeAuthModal();
    closeAdmin();
    closeSidebar();
  }
});
