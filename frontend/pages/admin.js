// pages/admin.js — список квестов в админке

async function loadAdmin() {
  try {
    const [statsData, questsData] = await Promise.all([
      api.getAdminStats(),
      api.listQuests(),
    ]);
    renderAdminStats(statsData);
    renderAdminQuests(questsData.quests || []);
  } catch(e) {
    document.getElementById('admin-quest-list').innerHTML =
      `<p style="color:var(--red)">${e.message}</p>`;
  }
}

function renderAdminStats(data) {
  document.getElementById('admin-stats').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="stat-card">
        <div class="stat-value" style="color:var(--accent)">${data.totalUsers}</div>
        <div class="stat-label">Total Users</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.submissions?.total || 0}</div>
        <div class="stat-label">Submissions</div>
      </div>
    </div>`;
}

function renderAdminQuests(quests) {
  const el = document.getElementById('admin-quest-list');
  if (!quests.length) {
    el.innerHTML = `<div class="empty"><p>No quests yet</p></div>`;
    return;
  }

  el.innerHTML = quests.map(q => `
    <div class="admin-quest-row">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-weight:700;font-size:16px">${esc(q.title)}</div>
          <div style="color:var(--muted);font-size:13px;margin-top:3px">${q.participantsCount || 0} participants</div>
        </div>
        ${badge(q.status)}
      </div>
      <div class="admin-actions">
        <button class="btn btn-ghost btn-sm" onclick="openEditor('${q.id}')">✏️ Edit</button>
        ${q.status === 'active'
          ? `<button class="btn btn-green btn-sm" onclick="finishQuest('${q.id}')">✓ Complete</button>`
          : ''}
        <button class="btn btn-ghost btn-sm" onclick="viewParticipants('${q.id}')">👥 Participants</button>
        <button class="btn btn-danger btn-sm" onclick="removeQuest('${q.id}')">🗑 Delete</button>
      </div>
      <div id="participants-${q.id}" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)"></div>
    </div>
  `).join('');
}

async function viewParticipants(questId) {
  const el = document.getElementById('participants-' + questId);
  if (el.style.display !== 'none') { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML = '<div class="spinner" style="margin:10px auto;width:20px;height:20px;border-width:2px"></div>';
  try {
    const data = await api.getParticipants(questId);
    const list = data.participants || [];
    el.innerHTML = list.length === 0
      ? '<p style="color:var(--muted);font-size:13px">No participants</p>'
      : list.map(p => `
          <div style="display:flex;justify-content:space-between;padding:8px 0;
            border-bottom:1px solid var(--border);font-size:13px">
            <span>${esc(p.firstName || p.username || 'Anonymous')}
              ${p.username ? `<span style="color:var(--muted)"> @${esc(p.username)}</span>` : ''}</span>
            <span style="font-family:var(--mono);color:var(--accent)">${p.score} pts</span>
          </div>`).join('');
  } catch(e) {
    el.innerHTML = `<p style="color:var(--red);font-size:13px">${e.message}</p>`;
  }
}

async function finishQuest(questId) {
  if (!confirm('Complete quest and pick top 3 winners?')) return;
  try {
    await api.completeQuest(questId, { winnersCount: 3 });
    toast('Quest completed! 🏆');
    loadAdmin();
  } catch(e) { toast(e.message, 'error'); }
}

async function removeQuest(questId) {
  if (!confirm('Delete this quest?')) return;
  try {
    await api.deleteQuest(questId);
    toast('Quest deleted');
    loadAdmin();
  } catch(e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-quest').addEventListener('click', () => openEditor(null));