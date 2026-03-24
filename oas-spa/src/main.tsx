import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// i18n は App より先にimportして初期化する
import '@/i18n';
import '@/styles/globals.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
