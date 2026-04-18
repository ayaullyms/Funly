import React from 'react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { id: 'home',     label: 'Quests'   },
  { id: 'myquests', label: 'My'       },
  { id: 'profile',  label: 'Profile'  },
] as const;

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
        /* safe area for iOS home indicator */
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
              {/* active dot */}
              <div style={{
                width: 4, height: 4, borderRadius: '50%',
                background: isActive ? '#7B6EF6' : 'transparent',
                transition: 'background 0.15s',
                marginBottom: 1,
              }} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}