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

function AppInner() {
  const { page, navigate, setCurrentUser } = useApp();
  const { setQuestId, setDetailState } = useQuestDetail();

  const [taskNav, setTaskNav] = useState<{ taskId: string; taskIndex: number } | null>(null);
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

  const showHeader = !['detail', 'editor', 'task'].includes(page);

  const PAGE_TITLE: Record<string, string> = {
    home: 'Funly',
    myquests: 'My Quests',
    profile: 'Profile',
    admin: 'Admin',
  };

  return (
    /* Outer: full dark bg */
    <div className="min-h-screen" style={{ background: '#0D0D14', color: '#e8e0ff' }}>
      <div className="max-w-lg mx-auto px-4 pt-4 pb-28">
        {showHeader && PAGE_TITLE[page] && (
          <h1
            className="font-black mb-5"
            style={{ fontSize: 22, letterSpacing: '-0.5px', color: '#fff' }}
          >
            {page === 'home' ? (
              <>fun<span style={{ color: '#7B6EF6' }}>ly</span></>
            ) : (
              PAGE_TITLE[page]
            )}
          </h1>
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
            onBack={() => navigate('detail')}
          />
        )}
        {page === 'editor' && (
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