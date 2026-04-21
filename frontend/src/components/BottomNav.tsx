import React from 'react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { id: 'home',      label: 'Quests'    },
  { id: 'myquests',  label: 'My quests' },
  { id: 'profile',   label: 'Profile'   },
] as const;

const ICONS: Record<string, (active: boolean) => React.ReactNode> = {
  home: (a) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={a ? '#7B6EF6' : '#44445a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  myquests: (a) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={a ? '#7B6EF6' : '#44445a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  ),
  profile: (a) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={a ? '#7B6EF6' : '#44445a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  admin: (a) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={a ? '#7B6EF6' : '#44445a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
    </svg>
  ),
};

export function BottomNav() {
  const { page, navigate, currentUser } = useApp();

  const items = currentUser?.role === 'admin'
    ? [...NAV_ITEMS, { id: 'admin' as const, label: 'Admin' }]
    : NAV_ITEMS;

  if (['detail', 'editor', 'task'].includes(page)) return null;

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: '#0D0D14',
      borderTop: '0.5px solid #1e1e32',
    }}>
      <div style={{
        display: 'flex', maxWidth: 512, margin: '0 auto',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {items.map(item => {
          const isActive = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '8px 0 10px',
                background: 'none', border: 'none', cursor: 'pointer',
                gap: 4,
                color: isActive ? '#7B6EF6' : '#44445a',
                fontFamily: 'IBM Plex Sans, sans-serif',
                fontSize: 10, fontWeight: 600,
                transition: 'color 0.15s',
              }}
            >
              {/* <div style={{
                width: 4, height: 4, borderRadius: '50%',
                background: isActive ? '#7B6EF6' : 'transparent',
                transition: 'background 0.15s',
                marginBottom: 1,
              }} /> */}
              {ICONS[item.id]?.(isActive)}
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}