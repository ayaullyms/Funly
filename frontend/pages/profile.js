// pages/profile.js — профиль, статистика, кошелёк, история наград

async function loadProfile() {
  const el = document.getElementById('profile-content');
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const [meData, statsData, rewardsData] = await Promise.all([
      api.getMe(),
      api.getMyStats(),
      api.getMyRewards(),
    ]);
    renderProfile(meData.user, statsData.stats, rewardsData.rewards || []);
  } catch(e) {
    el.innerHTML = `<p style="color:var(--red)">${e.message}</p>`;
  }
}

function renderProfile(user, stats, rewards) {
  const el = document.getElementById('profile-content');
  el.innerHTML = `
    <!-- Avatar -->
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px">
      <div class="avatar">
        ${user.photoUrl
          ? `<img src="${user.photoUrl}" alt="" />`
          : (user.firstName?.[0] || '?').toUpperCase()}
      </div>
      <div>
        <div style="font-size:20px;font-weight:800">${esc(user.firstName || '')} ${esc(user.lastName || '')}</div>
        ${user.username ? `<div style="color:var(--muted);font-size:14px">@${esc(user.username)}</div>` : ''}
        <span style="display:inline-block;margin-top:4px;padding:2px 10px;border-radius:12px;
          background:${user.role === 'admin' ? 'rgba(255,198,66,.15)' : 'rgba(79,140,255,.15)'};
          color:${user.role === 'admin' ? 'var(--yellow)' : 'var(--accent)'};
          font-size:11px;font-weight:700;font-family:var(--mono);text-transform:uppercase">${user.role}</span>
      </div>
    </div>

    <!-- Stats -->
    <p class="section-label">Stats</p>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value" style="color:var(--accent)">${stats?.totalTasksCompleted || 0}</div>
        <div class="stat-label">Tasks done</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--green)">${stats?.totalWins || 0}</div>
        <div class="stat-label">Wins</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--yellow)">${stats?.questsJoined || 0}</div>
        <div class="stat-label">Quests joined</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats?.questsCompleted || 0}</div>
        <div class="stat-label">Completed</div>
      </div>
    </div>

    ${Number(user.totalRewardsAmount) > 0 ? `
      <div class="card" style="display:flex;align-items:center;gap:14px;
        background:rgba(0,229,160,.06);border-color:rgba(0,229,160,.2);margin-bottom:20px">
        <div style="font-size:28px">💰</div>
        <div>
          <div style="font-size:12px;color:var(--muted);font-family:var(--mono);text-transform:uppercase">Total Earned</div>
          <div style="font-family:var(--mono);font-size:22px;font-weight:700;color:var(--green)">
            ${Number(user.totalRewardsAmount).toFixed(2)} TON
          </div>
        </div>
      </div>` : ''}

    <!-- Wallet -->
    <p class="section-label">TON Wallet</p>
    <div class="card" id="wallet-section" style="margin-bottom:20px">
      ${user.walletAddress ? `
        <div style="color:var(--green);font-weight:700;margin-bottom:10px">✓ Connected</div>
        <div class="wallet-addr">${esc(user.walletAddress)}</div>
        <button class="btn btn-danger" id="btn-disconnect" style="font-size:13px;padding:10px">Disconnect Wallet</button>
      ` : `
        <p style="color:var(--muted);font-size:14px;margin-bottom:12px">Connect TON wallet to receive rewards</p>
        <input class="input" id="wallet-input" placeholder="Paste TON wallet address…" style="margin-bottom:10px" />
        <button class="btn btn-green" id="btn-connect-wallet">Connect Wallet</button>
      `}
    </div>

    <!-- Reward history -->
    ${rewards.length ? `
      <p class="section-label">Reward History</p>
      ${rewards.map(r => `
        <div class="card" style="padding:14px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-weight:700;font-size:15px">${esc(r.questTitle)}</div>
              <div style="color:var(--muted);font-size:12px;margin-top:3px">${fmtDate(r.createdAt)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--mono);font-weight:700;font-size:16px;
                color:${r.status === 'distributed' ? 'var(--green)' : 'var(--yellow)'}">
                ${Number(r.amount).toFixed(2)} TON
              </div>
              ${badge(r.status)}
            </div>
          </div>
          ${r.transactionHash
            ? `<div style="margin-top:8px;font-family:var(--mono);font-size:11px;color:var(--muted);word-break:break-all">
                tx: ${esc(r.transactionHash)}</div>`
            : ''}
        </div>`).join('')}
    ` : ''}
  `;

  // wallet events
  el.querySelector('#btn-connect-wallet')?.addEventListener('click', async () => {
    const addr = el.querySelector('#wallet-input')?.value?.trim();
    if (!addr) { toast('Enter wallet address', 'error'); return; }
    try {
      await api.connectWallet({ walletAddress: addr });
      toast('Wallet connected! ✓');
      loadProfile();
    } catch(e) { toast(e.message, 'error'); }
  });

  el.querySelector('#btn-disconnect')?.addEventListener('click', async () => {
    try {
      await api.disconnectWallet();
      toast('Wallet disconnected');
      loadProfile();
    } catch(e) { toast(e.message, 'error'); }
  });
}