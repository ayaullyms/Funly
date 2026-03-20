// pages/home.js — главная страница со списком квестов

let allQuests = [];
let questFilter = '';

async function loadHome() {
  try {
    const data = await api.listQuests(questFilter);
    allQuests = data.quests || [];
    renderQuestList();
  } catch(e) {
    document.getElementById('quest-list').innerHTML =
      `<p style="color:var(--red);text-align:center">${e.message}</p>`;
  }
}

function renderQuestList() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const list = allQuests.filter(q =>
    !search ||
    q.title.toLowerCase().includes(search) ||
    (q.shortDescription || '').toLowerCase().includes(search)
  );

  const el = document.getElementById('quest-list');

  if (!list.length) {
    el.innerHTML = `<div class="empty"><div class="icon">🔍</div><p>No quests found</p></div>`;
    return;
  }

  el.innerHTML = list.map(q => `
    <div class="quest-card ${q.status === 'completed' ? 'completed-card' : ''}" onclick="openQuest('${q.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div class="quest-title" style="flex:1;padding-right:10px">${esc(q.title)}</div>
        ${badge(q.status)}
      </div>
      ${q.shortDescription ? `<div class="quest-desc">${esc(q.shortDescription)}</div>` : ''}
      <div class="quest-meta">
        ${q.rewardDescription ? `<span class="quest-reward">🏆 ${esc(q.rewardDescription)}</span>` : ''}
        <span>👥 ${q.participantsCount || 0}</span>
        ${q.endDate ? `<span>⏰ ${fmtDate(q.endDate)}</span>` : ''}
        ${q.isJoined ? `<span style="color:var(--accent);font-weight:700">✓ Joined</span>` : ''}
      </div>
    </div>
  `).join('');
}

// фильтр табы
document.querySelectorAll('#page-home .filter-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#page-home .filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    questFilter = btn.dataset.status;
    document.getElementById('quest-list').innerHTML = '<div class="spinner"></div>';
    loadHome();
  });
});

// поиск
document.getElementById('search-input').addEventListener('input', renderQuestList);