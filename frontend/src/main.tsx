import React from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { AppProvider } from './context/AppContext';
import { QuestDetailProvider } from './context/QuestDetailContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={`${window.location.origin}/tonconnect-manifest.json`}>
      <AppProvider>
        <QuestDetailProvider>
          <App />
        </QuestDetailProvider>
      </AppProvider>
    </TonConnectUIProvider>
  </React.StrictMode>
);
