// app.js — навигация, toast, helpers, init

let currentUser = null;

// ── TOAST ─────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = '', 2500);
}

// ── NAVIGATE ──────────────────────────────────
function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + pageId)?.classList.add('active');
  document.querySelector(`.nav-btn[data-page="${pageId}"]`)?.classList.add('active');

  if (pageId === 'home')     loadHome();
  if (pageId === 'myquests') loadMyQuests();
  if (pageId === 'profile')  loadProfile();
  if (pageId === 'admin')    loadAdmin();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.page));
});

// HELPERS 
function badge(status) {
  return `<span class="badge badge-${status}">${status}</span>`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d);
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// INIT
async function init() {
  try {
    const data = await api.getMe();
    currentUser = data.user;

    if (currentUser.role === 'admin') {
      document.getElementById('nav-admin').style.display = 'flex';
    }

    loadHome();
  } catch(e) {
    console.error('Init error:', e);
  }
}

init();