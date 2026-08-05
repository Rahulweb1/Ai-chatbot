import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle benign Vite HMR websocket connection noise in preview containers
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (String(event.reason).includes('WebSocket') || String(event.reason?.message).includes('WebSocket'))) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
