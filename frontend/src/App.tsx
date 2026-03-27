import React, { useEffect, useState } from 'react';
import { useApp } from './context/AppContext';
import { useQuestDetail } from './context/QuestDetailContext';
import { api } from './api';

import { BottomNav } from './components/BottomNav';
import { Toast } from './components/ui';

import { HomePage } from './pages/HomePage';
import { MyQuestsPage } from './pages/MyQuestsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { DetailPage } from './pages/DetailPage';
import { TaskPage } from './pages/TaskPage';
import { EditorPage } from './pages/EditorPage';

// Editor state lives here to pass questId down
function AppInner() {
  const { page, navigate, setCurrentUser, showToast } = useApp();
  const { setQuestId, setDetailState } = useQuestDetail();

  // Task sub-page state
  const [taskNav, setTaskNav] = useState<{ taskId: string; taskIndex: number } | null>(null);

  // Editor state
  const [editorQuestId, setEditorQuestId] = useState<string | null>(null);

  useEffect(() => {
    api.getMe()
      .then(d => setCurrentUser(d.user))
      .catch(e => console.error('Init error:', e));
  }, []);

  const openTask = (taskId: string, taskIndex: number) => {
    setTaskNav({ taskId, taskIndex });
    navigate('task');
  };

  const openEditor = (questId: string | null) => {
    setEditorQuestId(questId);
    navigate('editor');
  };

  const backFromTask = () => {
    navigate('detail');
  };

  const PAGE_TITLE: Record<string, string> = {
    home:     'Funly',
    myquests: 'My Quests',
    profile:  'Profile',
    admin:    'Admin',
    detail:   '',
    editor:   '',
    task:     '',
  };

  const showHeader = !['detail', 'editor', 'task'].includes(page);

  return (
    <div className="min-h-screen bg-[#4D2B8C] text-zinc-100">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {showHeader && PAGE_TITLE[page] && (
          <h1 className="font-black text-[22px] text-zinc-100 mb-5">{PAGE_TITLE[page]}</h1>
        )}

        {page === 'home'     && <HomePage />}
        {page === 'myquests' && <MyQuestsPage />}
        {page === 'profile'  && <ProfilePage />}
        {page === 'admin'    && <AdminPage onOpenEditor={openEditor} />}
        {page === 'detail'   && <DetailPage onOpenTask={openTask} />}
        {page === 'task'     && taskNav && (
          <TaskPage
            taskId={taskNav.taskId}
            taskIndex={taskNav.taskIndex}
            onBack={backFromTask}
          />
        )}
        {page === 'editor'   && (
          <EditorPage
            questId={editorQuestId}
            onBack={() => navigate('admin')}
          />
        )}
      </div>

      <BottomNav />
      <Toast />
    </div>
  );
}

export default AppInner;
