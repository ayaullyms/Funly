// api.js  все запросы к бэкенду

const BASE = 'http://localhost:3001/api';

// В dev-режиме передаём dev_mock вместо Telegram initData
function getInitData() {
  return window.Telegram?.WebApp?.initData || 'dev_mock';
}

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-init-data': getInitData(),
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const api = {
  // USER
  getMe:             ()           => request('GET',    '/users/me'),
  getMyStats:        ()           => request('GET',    '/users/me/stats'),
  getMyRewards:      ()           => request('GET',    '/users/me/rewards'),
  connectWallet:     (body)       => request('POST',   '/users/me/wallet', body),
  disconnectWallet:  ()           => request('DELETE', '/users/me/wallet'),

  // QUESTS
  listQuests:        (status='') => request('GET', `/quests${status ? '?status='+status : ''}`),
  getMyQuests:       ()          => request('GET', '/quests/my'),
  getQuest:          (id)        => request('GET', `/quests/${id}`),
  getLeaderboard:    (id)        => request('GET', `/quests/${id}/leaderboard`),
  joinQuest:         (id)        => request('POST', `/quests/${id}/join`),

  // TASKS
  submitTask: (questId, taskId, answer) =>
    request('POST', `/quests/${questId}/tasks/${taskId}/submit`, { answer }),

  // ADMIN
  getAdminStats:     ()           => request('GET',    '/admin/stats'),
  createQuest:       (body)       => request('POST',   '/admin/quests', body),
  updateQuest:       (id, body)   => request('PUT',    `/admin/quests/${id}`, body),
  deleteQuest:       (id)         => request('DELETE', `/admin/quests/${id}`),
  createTask:        (qid, body)  => request('POST',   `/admin/quests/${qid}/tasks`, body),
  updateTask:        (tid, body)  => request('PUT',    `/admin/tasks/${tid}`, body),
  getParticipants:   (id)         => request('GET',    `/admin/quests/${id}/participants`),
  completeQuest:     (id, body)   => request('POST',   `/admin/quests/${id}/complete`, body),
  distributeReward:  (rid, body)  => request('POST',   `/admin/rewards/${rid}/distribute`, body),
};