// pages/editor.js — редактор квеста (отдельная страница)

let editorQuestId = null;
let editorTasks = [];

// ── ОТКРЫТЬ РЕДАКТОР ──────────────────────────
async function openEditor(questId) {
  editorQuestId = questId;
  editorTasks = [];

  // переключить страницу (без навигации через nav)
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-editor').classList.add('active');

  // сбросить форму
  ['eq-title', 'eq-short', 'eq-full', 'eq-reward', 'eq-rules', 'eq-start', 'eq-end']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('eq-status').value = 'draft';
  document.getElementById('editor-title').textContent = questId ? 'Edit Quest' : 'New Quest';
  document.getElementById('danger-zone').style.display = questId ? 'block' : 'none';
  document.getElementById('tasks-editor-list').innerHTML = '';

  // если редактируем — загружаем данные
  if (questId) {
    try {
      const { quest, tasks } = await api.getQuest(questId);
      document.getElementById('eq-title').value   = quest.title || '';
      document.getElementById('eq-short').value   = quest.shortDescription || '';
      document.getElementById('eq-full').value    = quest.fullDescription || '';
      document.getElementById('eq-reward').value  = quest.rewardDescription || '';
      document.getElementById('eq-rules').value   = quest.rules || '';
      document.getElementById('eq-status').value  = quest.status || 'draft';
      if (quest.startDate) document.getElementById('eq-start').value = quest.startDate.slice(0, 10);
      if (quest.endDate)   document.getElementById('eq-end').value   = quest.endDate.slice(0, 10);

      editorTasks = tasks.map(t => ({
        id:            t.id,
        title:         t.title,
        description:   t.description || '',
        taskType:      t.taskType,
        correctAnswer: t.correctAnswer || '',
        options:       Array.isArray(t.options) ? t.options : ['', '', '', ''],
        points:        t.points,
        orderIndex:    t.orderIndex,
      }));
      renderTasksEditor();
    } catch(e) { toast(e.message, 'error'); }
  }
}

// кнопка назад
document.getElementById('editor-back').addEventListener('click', () => navigate('admin'));

// ── СОХРАНИТЬ ИНФО КВЕСТА ─────────────────────
document.getElementById('btn-save-quest-info').addEventListener('click', async () => {
  const title = document.getElementById('eq-title').value.trim();
  if (!title) { toast('Title is required', 'error'); return; }

  const btn = document.getElementById('btn-save-quest-info');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const body = {
      title,
      shortDescription:  document.getElementById('eq-short').value,
      fullDescription:   document.getElementById('eq-full').value,
      rewardDescription: document.getElementById('eq-reward').value,
      rules:             document.getElementById('eq-rules').value,
      startDate:         document.getElementById('eq-start').value || null,
      endDate:           document.getElementById('eq-end').value || null,
      status:            document.getElementById('eq-status').value,
    };

    if (editorQuestId) {
      await api.updateQuest(editorQuestId, body);
      toast('Quest updated ✓');
    } else {
      const data = await api.createQuest(body);
      editorQuestId = data.quest.id;
      document.getElementById('editor-title').textContent = 'Edit Quest';
      document.getElementById('danger-zone').style.display = 'none';
      toast('Quest created! 🎉');
    }
  } catch(e) { toast(e.message, 'error'); }
  finally {
    btn.disabled = false;
    btn.textContent = '💾 Save Quest Info';
  }
});

// ── ДОБАВИТЬ ЗАДАНИЕ ──────────────────────────
document.getElementById('btn-add-task').addEventListener('click', () => {
  editorTasks.push({
    id: null,
    title: '',
    description: '',
    taskType: 'multiple_choice',
    correctAnswer: '',
    options: ['', '', '', ''],
    points: 10,
    orderIndex: editorTasks.length,
  });
  renderTasksEditor();
  setTimeout(() => {
    document.getElementById('tasks-editor-list').lastElementChild
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
});

// ── РЕНДЕР ЗАДАНИЙ В РЕДАКТОРЕ ────────────────
function renderTasksEditor() {
  const el = document.getElementById('tasks-editor-list');

  if (!editorTasks.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:14px;text-align:center;padding:20px">
      No tasks yet — click "+ Add Task"
    </div>`;
    return;
  }

  el.innerHTML = editorTasks.map((t, i) => {
    const isMulti = t.taskType === 'multiple_choice';
    const opts = t.options?.length ? t.options : ['', '', '', ''];

    return `
    <div class="task-editor" id="te-${i}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="task-num">${i + 1}</div>
          <span style="font-weight:700">Task ${i + 1}</span>
        </div>
        <button class="btn btn-danger btn-icon" onclick="removeTask(${i})">🗑</button>
      </div>

      <div class="input-group">
        <div class="input-label">Question *</div>
        <input class="input" placeholder="Task question" value="${esc(t.title)}"
          oninput="editorTasks[${i}].title = this.value" />
      </div>

      <div class="input-group">
        <div class="input-label">Description (optional)</div>
        <input class="input" placeholder="Hint or extra context" value="${esc(t.description)}"
          oninput="editorTasks[${i}].description = this.value" />
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div>
          <div class="input-label">Type</div>
          <select class="input" onchange="changeTaskType(${i}, this.value)">
            <option value="multiple_choice" ${t.taskType === 'multiple_choice' ? 'selected' : ''}>Multiple choice — варианты ответов</option>
            <option value="quiz"            ${t.taskType === 'quiz'            ? 'selected' : ''}>Quiz — написать слово/фразу</option>
            <option value="text"            ${t.taskType === 'text'            ? 'selected' : ''}>Text — написать точный ответ</option>
          </select>
        </div>
        <div>
          <div class="input-label">Points</div>
          <input type="number" class="input" value="${t.points}" min="1"
            oninput="editorTasks[${i}].points = parseInt(this.value) || 10" />
        </div>
      </div>

      ${isMulti ? `
        <div class="input-label">Options — ⬤ = correct answer</div>
        ${opts.map((o, oi) => `
          <div class="option-editor-row">
            <input type="radio" class="option-radio" name="cr-${i}"
              ${t.correctAnswer === o && o ? 'checked' : ''}
              onchange="setCorrectOption(${i}, ${oi})" />
            <input class="input" placeholder="Option ${oi + 1}" value="${esc(o)}"
              oninput="updateOption(${i}, ${oi}, this.value)" />
          </div>`).join('')}
        <p style="color:var(--muted);font-size:12px;margin-top:4px">⬤ marks the correct answer</p>
      ` : `
        <div class="input-label">Correct answer *</div>
        <input class="input" placeholder="Exact correct answer (not case-sensitive)"
          value="${esc(t.correctAnswer)}"
          oninput="editorTasks[${i}].correctAnswer = this.value" />
        <p style="color:var(--muted);font-size:12px;margin-top:4px">
          User types an answer — compared to this automatically
        </p>
      `}

      <button class="btn btn-primary" onclick="saveTask(${i})" style="margin-top:14px">
        ${t.id ? '💾 Update Task' : '➕ Add Task'}
      </button>
    </div>`;
  }).join('');
}

// ── HELPERS ДЛЯ ЗАДАНИЙ ───────────────────────
function updateOption(taskIdx, optIdx, val) {
  if (!editorTasks[taskIdx].options) editorTasks[taskIdx].options = [];
  editorTasks[taskIdx].options[optIdx] = val;
}

function setCorrectOption(taskIdx, optIdx) {
  editorTasks[taskIdx].correctAnswer = editorTasks[taskIdx].options[optIdx] || '';
}

function changeTaskType(taskIdx, newType) {
  editorTasks[taskIdx].taskType = newType;
  if (newType === 'multiple_choice' && !editorTasks[taskIdx].options?.filter(o => o).length) {
    editorTasks[taskIdx].options = ['', '', '', ''];
  }
  renderTasksEditor();
}

function removeTask(taskIdx) {
  if (editorTasks[taskIdx].id && !confirm('Delete this task?')) return;
  editorTasks.splice(taskIdx, 1);
  renderTasksEditor();
}

// ── СОХРАНИТЬ ЗАДАНИЕ ─────────────────────────
async function saveTask(taskIdx) {
  if (!editorQuestId) { toast('Save quest info first', 'error'); return; }

  const t = editorTasks[taskIdx];
  if (!t.title.trim()) { toast('Question is required', 'error'); return; }

  const btn = document.querySelector(`#te-${taskIdx} .btn-primary`);
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  try {
    const body = {
      title:         t.title,
      description:   t.description,
      taskType:      t.taskType,
      correctAnswer: t.correctAnswer,
      options:       t.taskType === 'multiple_choice'
                       ? t.options.filter(o => o.trim())
                       : [],
      points:        t.points,
      orderIndex:    taskIdx,
    };

    if (t.id) {
      await api.updateTask(t.id, body);
      toast('Task updated ✓');
    } else {
      const data = await api.createTask(editorQuestId, body);
      editorTasks[taskIdx].id = data.task.id;
      toast('Task added ✓');
    }
    renderTasksEditor();
  } catch(e) { toast(e.message, 'error'); }
  finally { if (btn) btn.disabled = false; }
}

// ── ЗАВЕРШИТЬ КВЕСТ ───────────────────────────
document.getElementById('btn-complete-quest').addEventListener('click', async () => {
  if (!editorQuestId) return;
  if (!confirm('Complete quest and pick top 3 winners?')) return;
  try {
    await api.completeQuest(editorQuestId, { winnersCount: 3 });
    toast('Quest completed! 🏆');
    navigate('admin');
  } catch(e) { toast(e.message, 'error'); }
});

// ── УДАЛИТЬ КВЕСТ ─────────────────────────────
document.getElementById('btn-delete-quest').addEventListener('click', async () => {
  if (!editorQuestId) return;
  if (!confirm('Delete this quest? Cannot be undone.')) return;
  try {
    await api.deleteQuest(editorQuestId);
    toast('Quest deleted');
    navigate('admin');
  } catch(e) { toast(e.message, 'error'); }
});