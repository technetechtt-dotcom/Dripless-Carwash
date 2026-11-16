import './index.css';
import 'leaflet/dist/leaflet.css';
import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import { App } from "./App";

const runtimeWindow = window as Window & { __DRIPLESS_API_BASE_URL__?: string };
if (import.meta.env.VITE_API_BASE_URL) {
  runtimeWindow.__DRIPLESS_API_BASE_URL__ = import.meta.env.VITE_API_BASE_URL;
}

registerSW({ immediate: true });

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);