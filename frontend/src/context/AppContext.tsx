import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { User } from '../types';

type Page = 'home' | 'myquests' | 'profile' | 'admin' | 'detail' | 'editor' | 'task';

interface ToastState {
  message: string;
  type: 'success' | 'error';
  id: number;
}

interface AppContextValue {
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  page: Page;
  navigate: (p: Page) => void;
  toast: ToastState | null;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('home');
  const [toast, setToast] = useState<ToastState | null>(null);

  const navigate = useCallback((p: Page) => setPage(p), []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToast({ message, type, id });
    setTimeout(() => setToast(prev => prev?.id === id ? null : prev), 2500);
  }, []);

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, page, navigate, toast, showToast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
