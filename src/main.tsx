import React from 'react';
import * as ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import App from './App';

// 将React暴露给全局作用域，以便在Electron中访问
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
