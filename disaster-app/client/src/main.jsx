import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './i18n.js';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App.jsx';
import { initialiseApp } from './store.js';

initialiseApp();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
