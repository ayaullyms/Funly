// pages/detail.js

let currentQuestId = null;
let currentQuestData = null;

async function openQuest(id) {
  currentQuestId = id;
  navigate('detail');
  const el = document.getElementById('detail-content');
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const [questData, lbData] = await Promise.all([api.getQuest(id), api.getLeaderboard(id)]);
    currentQuestData = { questData, lbData };
    renderDetail(questData, lbData);
  } catch(e) {
    el.innerHTML = `<p style="color:var(--red)">${e.message}</p>`;
  }
}

async function refreshQuestData() {
  if (!currentQuestId) return null;
  try {
    const questData = await api.getQuest(currentQuestId);
    currentQuestData.questData = questData;
    return questData;
  } catch(e) { return null; }
}

function renderDetail({ quest: q, tasks }, lbData) {
  const lb = lbData?.leaderboard || [];
  const el = document.getElementById('detail-content');

  el.innerHTML = `
    <div class="quest-hero">
      <button class="back-btn" onclick="navigate('home')">← Back</button>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div class="quest-hero-title" style="flex:1;padding-right:12px">${esc(q.title)}</div>
        ${badge(q.status)}
      </div>
      ${q.rewardDescription ? `<div style="color:var(--green);font-weight:700;font-family:var(--mono);font-size:14px;margin-bottom:10px">🏆 ${esc(q.rewardDescription)}</div>` : ''}
      <div style="display:flex;gap:14px;color:var(--muted);font-size:13px;margin-bottom:14px;flex-wrap:wrap">
        <span>👥 ${q.participantsCount || 0} participants</span>
        ${q.endDate ? `<span>📅 ${fmtDate(q.endDate)}</span>` : ''}
      </div>

      ${q.isJoined ? `
        <div class="my-score-bar">
          <div class="my-score-item">
            <div class="my-score-val">${q.myScore || 0}</div>
            <div class="my-score-lbl">Score</div>
          </div>
          <div class="my-score-item">
            <div class="my-score-val">${q.myRank ? '#'+q.myRank : '—'}</div>
            <div class="my-score-lbl">Rank</div>
          </div>
          <div class="my-score-item">
            <div class="my-score-val" style="color:${q.isQuestCompleted?'var(--green)':'var(--text)'}">
              ${q.myCompletedTasks||0}/${q.totalTasks||0}
            </div>
            <div class="my-score-lbl">Tasks</div>
          </div>
          ${q.iWon ? `<div class="my-score-item" style="display:flex;align-items:center;gap:6px;color:var(--yellow);font-weight:700">🏆 Winner!</div>` : ''}
        </div>
        ${q.isQuestCompleted ? `
          <div style="padding:12px 16px;background:rgba(0,229,160,.1);border:1px solid rgba(0,229,160,.3);
            border-radius:10px;color:var(--green);font-weight:700;text-align:center;margin-bottom:14px;font-size:15px">
            🎉 You completed this quest!
          </div>` : ''}
      ` : ''}

      ${q.status==='active'&&!q.isJoined ? `
        <div style="padding-bottom:16px">
          <button class="btn btn-primary" id="btn-join">⚡ Join Quest</button>
        </div>` : ''}

      <div class="tabs">
        <button class="tab-btn active" data-tab="overview">Overview</button>
        <button class="tab-btn" data-tab="tasks">
          Tasks${q.isJoined&&q.totalTasks
            ? `<span style="margin-left:5px;background:var(--bg3);border-radius:10px;padding:1px 7px;font-size:11px">${q.myCompletedTasks||0}/${q.totalTasks}</span>`
            : tasks?.length ? ` (${tasks.length})` : ''}
        </button>
        <button class="tab-btn" data-tab="leaderboard">Board</button>
        <button class="tab-btn" data-tab="rules">Rules</button>
      </div>
    </div>

    <div class="tab-panel active" id="tab-overview">
      ${q.fullDescription ? `<p style="line-height:1.75;font-size:15px">${esc(q.fullDescription)}</p><div class="divider"></div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${q.startDate ? `<div class="card" style="padding:14px"><div class="section-label">Start</div><div style="font-weight:700">${fmtDate(q.startDate)}</div></div>` : ''}
        ${q.endDate   ? `<div class="card" style="padding:14px"><div class="section-label">End</div><div style="font-weight:700">${fmtDate(q.endDate)}</div></div>` : ''}
      </div>
    </div>

    <div class="tab-panel" id="tab-tasks">${renderTaskList(tasks, q)}</div>
    <div class="tab-panel" id="tab-leaderboard">${renderLeaderboard(lbData)}</div>
    <div class="tab-panel" id="tab-rules">
      ${q.rules ? `<p style="white-space:pre-wrap;line-height:1.8;font-size:15px">${esc(q.rules)}</p>` : `<div class="empty"><p>No rules</p></div>`}
    </div>
  `;

  el.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      el.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      el.querySelector('#tab-'+btn.dataset.tab)?.classList.add('active');
    });
  });

  el.querySelector('#btn-join')?.addEventListener('click', async () => {
    try { await api.joinQuest(currentQuestId); toast('Joined! 🎉'); openQuest(currentQuestId); }
    catch(e) { toast(e.message, 'error'); }
  });
}

// ── СПИСОК ЗАДАНИЙ ────────────────────────────
function renderTaskList(tasks, quest) {
  if (!quest.isJoined && quest.status === 'active') {
    return `<div class="empty"><div class="icon">🔒</div><p>Join the quest to unlock tasks</p></div>`;
  }
  if (!tasks?.length) return `<div class="empty"><p>No tasks yet</p></div>`;

  const done = tasks.filter(t => t.myAnswer != null).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((done/total)*100) : 0;

  const progressBar = quest.isJoined ? `
    <div style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted);margin-bottom:8px">
        <span>Progress</span>
        <span style="font-family:var(--mono);font-weight:700;color:${done===total&&total>0?'var(--green)':'var(--text)'}">
          ${done} / ${total} done
        </span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
    </div>` : '';

  const items = tasks.map((t, i) => {
    const submitted = t.myAnswer != null;
    let iconContent = submitted ? (t.myAnswerCorrect ? '✓' : '✗') : `${i+1}`;
    let iconClass   = submitted ? (t.myAnswerCorrect ? 'correct' : 'wrong') : 'pending';
    const canClick  = quest.isJoined && quest.status === 'active' && !submitted;
    const canView   = submitted;

    return `
      <div class="task-list-item ${submitted?'done':''}"
        onclick="${canClick||canView ? `openTask('${t.id}',${i})` : ''}"
        style="${!canClick&&!canView?'cursor:default':''}">
        <div class="task-status-icon ${iconClass}">${iconContent}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:15px">${esc(t.title)}</div>
          ${t.description ? `<div style="color:var(--muted);font-size:13px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.description)}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;margin-left:10px">
          <span style="font-family:var(--mono);color:var(--green);font-size:13px;font-weight:700">+${t.points}pts</span>
          ${submitted
            ? `<span style="font-size:11px;color:${t.myAnswerCorrect?'var(--green)':'var(--red)'}">
                ${t.myAnswerCorrect ? `+${t.myPoints} pts earned` : '0 pts'}</span>`
            : `<span style="font-size:11px;color:var(--muted)">${quest.status==='active'?'Tap to answer':'—'}</span>`}
        </div>
      </div>`;
  }).join('');

  return progressBar + items;
}

// leaderboard 
function renderLeaderboard(lbData) {
  const lb = lbData?.leaderboard || [];
  const myPosition = lbData?.myPosition || null;
  const totalParticipants = lbData?.totalParticipants || 0;

  if (!lb.length) return `<div class="empty"><div class="icon">🏆</div><p>No participants yet</p></div>`;

  const myBar = myPosition ? `
    <div style="background:rgba(79,140,255,.08);border:1px solid rgba(79,140,255,.25);
      border-radius:10px;padding:12px 16px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:700;font-size:14px">Your position</span>
        <span style="color:var(--accent);font-family:var(--mono);font-size:18px;font-weight:700">
          #${myPosition.rank}
        </span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
        <span style="color:var(--muted);font-size:13px">
          out of ${totalParticipants} participants
        </span>
        <span style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--green)">
          ${myPosition.score} pts
        </span>
      </div>
      ${!myPosition.inTop50 ? `
        <div style="margin-top:8px;font-size:12px;color:var(--muted)">
          Not in top 50 yet — answer more tasks to climb up 🚀
        </div>` : ''}
    </div>` : '';

  const rows = lb.map((e, i) => {
    const r = i + 1;
    const em = r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`;
    const isMe = e.isMe;
    return `
      <div class="lb-row ${r <= 3 ? 'top' : ''}"
        style="${isMe ? 'background:rgba(79,140,255,.1);border:1px solid rgba(79,140,255,.3);border-radius:10px;' : ''}">
        <div class="lb-rank">${em}</div>
        <div class="lb-name">
          ${esc(e.firstName || e.username || 'Anonymous')}
          ${e.username ? `<span style="color:var(--muted);font-size:12px"> @${esc(e.username)}</span>` : ''}
          ${isMe ? `<span style="font-size:11px;color:var(--accent);margin-left:4px;font-weight:700">you</span>` : ''}
          ${e.status === 'completed' ? `<span style="font-size:11px;color:var(--green);margin-left:4px">✓</span>` : ''}
        </div>
        <div class="lb-score">${e.score}<span style="font-size:11px;color:var(--muted)">pts</span></div>
        ${e.isWinner ? '🏆' : ''}
      </div>`;
  }).join('');

  const footer = totalParticipants > 50 ? `
    <div style="text-align:center;color:var(--muted);font-size:13px;padding:16px 0;font-family:var(--mono)">
      Showing top 50 of ${totalParticipants} participants
    </div>` : '';

  return myBar + rows + footer;
}