// pages/task.js — отдельная страница прохождения задания

let currentTask = null;
let currentTaskIndex = 0;
let taskAnswerSelected = null;

// Открыть задание
function openTask(taskId, taskIndex) {
  if (!currentQuestData) return;

  const { questData } = currentQuestData;
  const tasks = questData.tasks;
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  currentTask = task;
  currentTaskIndex = taskIndex;
  taskAnswerSelected = null;

  // Переключаем страницу (без изменения nav)
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-task').classList.add('active');

  renderTaskPage(task, tasks, questData.quest);
}

function renderTaskPage(task, allTasks, quest) {
  const el = document.getElementById('task-content');
  const totalTasks = allTasks.length;
  const taskNum = currentTaskIndex + 1;
  const pct = Math.round(((taskNum - 1) / totalTasks) * 100);
  const submitted = task.myAnswer != null;
  const opts = Array.isArray(task.options) ? task.options : [];
  const isMulti = opts.length > 0;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  el.innerHTML = `
    <!-- Hero с прогрессом -->
    <div class="task-page-hero">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <button class="back-btn" onclick="backToQuest()" style="margin-bottom:0">← Tasks</button>
        <span style="font-family:var(--mono);font-size:12px;color:var(--muted);font-weight:700">
          ${taskNum} / ${totalTasks}
        </span>
      </div>

      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:4px;font-family:var(--mono)">
        <span>${quest.title}</span>
        <span>+${task.points} pts</span>
      </div>
    </div>

    <!-- Вопрос -->
    <div style="margin-bottom:24px">
      <div class="task-question">${esc(task.title)}</div>
      ${task.description ? `<p style="color:var(--muted);font-size:14px;line-height:1.6">${esc(task.description)}</p>` : ''}
    </div>

    <!-- Варианты или текстовое поле -->
    ${submitted ? renderSubmittedTask(task, opts, letters) : renderActiveTask(task, opts, letters, quest.status)}

    <!-- Навигация между заданиями -->
    <div style="display:flex;gap:10px;margin-top:24px">
      ${currentTaskIndex > 0
        ? `<button class="btn btn-ghost" onclick="goToTask(${currentTaskIndex-1})" style="flex:1">← Prev</button>`
        : ''}
      ${currentTaskIndex < totalTasks - 1
        ? `<button class="btn btn-ghost" onclick="goToTask(${currentTaskIndex+1})" style="flex:1">Next →</button>`
        : `<button class="btn btn-primary" onclick="backToQuest()" style="flex:1">View Results →</button>`}
    </div>
  `;

  // вешаем события на кнопки вариантов
  if (!submitted && isMulti) {
    el.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => selectChoice(btn));
    });
  }

  // кнопка submit
  el.querySelector('#btn-task-submit')?.addEventListener('click', submitCurrentTask);

  // enter для текстового поля
  el.querySelector('#task-text-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitCurrentTask();
  });
}

function renderActiveTask(task, opts, letters, questStatus) {
  if (questStatus !== 'active') {
    return `<div class="empty"><p>Quest is not active</p></div>`;
  }

  if (opts.length > 0) {
    // Multiple choice
    return `
      <div id="choices-list">
        ${opts.map((o, i) => `
          <button class="choice-btn" data-value="${esc(o)}">
            <div class="choice-letter">${letters[i] || i+1}</div>
            <span>${esc(o)}</span>
          </button>`).join('')}
      </div>
      <button class="btn btn-primary" id="btn-task-submit" disabled style="margin-top:16px">
        Check Answer
      </button>`;
  } else {
    // Text input
    return `
      <input class="input" id="task-text-input"
        placeholder="Type your answer…"
        style="margin-bottom:12px;font-size:16px;padding:16px" />
      <button class="btn btn-primary" id="btn-task-submit">
        Check Answer
      </button>`;
  }
}

function renderSubmittedTask(task, opts, letters) {
  const isCorrect = task.myAnswerCorrect;

  if (opts.length > 0) {
    // Показываем все варианты, выделяем правильный и выбранный
    return `
      <div>
        ${opts.map((o, i) => {
          let cls = 'choice-btn';
          if (o === task.myAnswer && isCorrect) cls += ' correct';
          else if (o === task.myAnswer && !isCorrect) cls += ' wrong';
          return `
            <button class="${cls}" disabled>
              <div class="choice-letter">${letters[i] || i+1}</div>
              <span>${esc(o)}</span>
            </button>`;
        }).join('')}
      </div>
      <div class="task-result ${isCorrect?'correct':'incorrect'}" style="margin-top:16px">
        ${isCorrect ? `✓ Correct! +${task.myPoints} pts` : `✗ Wrong answer`}
      </div>`;
  } else {
    return `
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;
        padding:14px 16px;margin-bottom:12px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Your answer</div>
        <div style="font-weight:700">${esc(task.myAnswer || '—')}</div>
      </div>
      <div class="task-result ${isCorrect?'correct':'incorrect'}">
        ${isCorrect ? `✓ Correct! +${task.myPoints} pts` : `✗ Wrong answer`}
      </div>`;
  }
}

// Выбор варианта
function selectChoice(btn) {
  document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  taskAnswerSelected = btn.dataset.value;

  const submitBtn = document.getElementById('btn-task-submit');
  if (submitBtn) submitBtn.disabled = false;
}

// Отправить ответ
async function submitCurrentTask() {
  if (!currentTask || !currentQuestId) return;

  const opts = Array.isArray(currentTask.options) ? currentTask.options : [];
  let answer;

  if (opts.length > 0) {
    // multiple choice
    if (!taskAnswerSelected) { toast('Select an answer', 'error'); return; }
    answer = taskAnswerSelected;
  } else {
    // text
    const input = document.getElementById('task-text-input');
    answer = input?.value?.trim();
    if (!answer) { toast('Enter your answer', 'error'); return; }
  }

  const btn = document.getElementById('btn-task-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Checking…'; }

  try {
    const res = await api.submitTask(currentQuestId, currentTask.id, answer);

    // Обновляем локальные данные задания
    currentTask.myAnswer = answer;
    currentTask.myAnswerCorrect = res.isCorrect;
    currentTask.myPoints = res.pointsAwarded;

    // Обновляем данные квеста в кеше
    if (currentQuestData?.questData?.tasks) {
      const taskInCache = currentQuestData.questData.tasks.find(t => t.id === currentTask.id);
      if (taskInCache) {
        taskInCache.myAnswer = answer;
        taskInCache.myAnswerCorrect = res.isCorrect;
        taskInCache.myPoints = res.pointsAwarded;
      }
      // Обновляем счёт в кеше
      if (currentQuestData.questData.quest) {
        currentQuestData.questData.quest.myScore = res.currentScore;
        currentQuestData.questData.quest.myRank = res.currentRank;
        currentQuestData.questData.quest.myCompletedTasks =
          (currentQuestData.questData.quest.myCompletedTasks || 0) + 1;
        if (res.questCompleted) {
          currentQuestData.questData.quest.isQuestCompleted = true;
          currentQuestData.questData.quest.myStatus = 'completed';
        }
      }
    }

    // Показываем результат на этой же странице
    toast(
      res.isCorrect ? `✓ Correct! +${res.pointsAwarded} pts 🎯` : '✗ Wrong answer 😕',
      res.isCorrect ? 'success' : 'error'
    );

    // Если квест завершён — показываем поздравление
    if (res.questCompleted) {
      setTimeout(() => toast('🎉 Quest completed!', 'success'), 1000);
    }

    // Перерисовываем страницу задания с результатом
    const { questData } = currentQuestData;
    renderTaskPage(currentTask, questData.tasks, questData.quest);

  } catch(e) {
    toast(e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Check Answer'; }
  }
}

// Перейти к другому заданию
function goToTask(index) {
  if (!currentQuestData) return;
  const tasks = currentQuestData.questData.tasks;
  if (index < 0 || index >= tasks.length) return;
  const task = tasks[index];
  currentTask = task;
  currentTaskIndex = index;
  taskAnswerSelected = null;
  renderTaskPage(task, tasks, currentQuestData.questData.quest);
}

// Вернуться к квесту (вкладка Tasks)
function backToQuest() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-detail').classList.add('active');
  document.querySelector('.nav-btn[data-page="home"]')?.classList.remove('active');

  // Перерисовываем вкладку tasks с обновлёнными данными
  if (currentQuestData) {
    const { questData, lbData } = currentQuestData;
    renderDetail(questData, lbData);
    // Автоматически активируем вкладку tasks
    setTimeout(() => {
      const tasksTab = document.querySelector('.tab-btn[data-tab="tasks"]');
      if (tasksTab) tasksTab.click();
    }, 50);
  }
}