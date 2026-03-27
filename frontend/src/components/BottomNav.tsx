import React from 'react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { id: 'home',     label: 'Quests' },
  { id: 'myquests', label: 'My Quests' },
  { id: 'profile',  label: 'Profile' },
] as const;

export function BottomNav() {
  const { page, navigate, currentUser } = useApp();

  const items = currentUser?.role === 'admin'
    ? [...NAV_ITEMS, { id: 'admin' as const, label: 'Admin' }]
    : NAV_ITEMS;

  // Hide nav on sub-pages
  if (page === 'detail' || page === 'editor' || page === 'task') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-50 backdrop-blur border-t border-purple-100">
      <div className="flex max-w-lg mx-auto">
        {items.map(item => {
          const isActive = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-[11px] font-semibold transition-colors ${
                isActive ? 'text-purple-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <div className={`w-1 h-1 rounded-full mb-0.5 transition-all ${isActive ? 'bg-purple-400 scale-125' : 'bg-transparent'}`} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
