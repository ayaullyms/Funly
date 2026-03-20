// pages/myquests.js — мои квесты

let myQuestsFilter = 'all';

async function loadMyQuests() {
  const el = document.getElementById('myquests-list');
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const data = await api.getMyQuests();
    renderMyQuests(data.quests || []);
  } catch(e) {
    el.innerHTML = `<p style="color:var(--red);text-align:center">${e.message}</p>`;
  }
}

function renderMyQuests(quests) {
  const filtered = quests.filter(q =>
    myQuestsFilter === 'all' ? true : q.status === myQuestsFilter
  );
  const el = document.getElementById('myquests-list');

  if (!filtered.length) {
    el.innerHTML = `
      <div class="empty">
        <div class="icon">🗡️</div>
        <p>No quests yet</p>
        <button class="btn btn-primary" onclick="navigate('home')"
          style="width:auto;padding:10px 24px;margin-top:12px">Browse Quests</button>
      </div>`;
    return;
  }

  el.innerHTML = filtered.map(q => `
    <div class="quest-card" onclick="openQuest('${q.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div class="quest-title" style="flex:1;padding-right:10px">${esc(q.title)}</div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          ${badge(q.status)}
          ${q.isWinner ? `<span class="badge badge-winner">🏆 Winner</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:20px;align-items:center">
        <div style="text-align:center">
          <div style="font-family:var(--mono);font-size:20px;font-weight:700;color:var(--accent)">${q.score || 0}</div>
          <div style="font-size:11px;color:var(--muted);font-family:var(--mono);text-transform:uppercase">Score</div>
        </div>
        <div style="text-align:center">
          <div style="font-family:var(--mono);font-size:20px;font-weight:700">${q.rank ? '#' + q.rank : '—'}</div>
          <div style="font-size:11px;color:var(--muted);font-family:var(--mono);text-transform:uppercase">Rank</div>
        </div>
        <div style="margin-left:auto;color:var(--muted);font-size:13px">${timeAgo(q.joinedAt)}</div>
      </div>
    </div>
  `).join('');
}

// фильтр табы
document.querySelectorAll('#myquests-filters .filter-tab').forEach(btn => {
  btn.addEventListener('click', async () => {
    document.querySelectorAll('#myquests-filters .filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    myQuestsFilter = btn.dataset.filter;
    const data = await api.getMyQuests().catch(() => ({ quests: [] }));
    renderMyQuests(data.quests || []);
  });
});