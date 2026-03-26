import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider } from './context/AppContext';
import { QuestDetailProvider } from './context/QuestDetailContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <QuestDetailProvider>
        <App />
      </QuestDetailProvider>
    </AppProvider>
  </React.StrictMode>
);
