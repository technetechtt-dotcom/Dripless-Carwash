import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { OpsAuthProvider } from './contexts/OpsAuthContext';
import './styles.css';
import 'leaflet/dist/leaflet.css';

const runtimeWindow = window as Window & { __DRIPLESS_API_BASE_URL__?: string };
if (import.meta.env.VITE_API_BASE_URL) {
  runtimeWindow.__DRIPLESS_API_BASE_URL__ = import.meta.env.VITE_API_BASE_URL;
}

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <OpsAuthProvider>
        <App />
      </OpsAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
