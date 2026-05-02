import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initAnalytics } from './analytics';
import App from './App';
import './styles.css';

createRoot(document.querySelector<HTMLDivElement>('#app')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

initAnalytics();
