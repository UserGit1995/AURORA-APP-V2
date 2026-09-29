import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AdminProvider } from './context/AdminContext.tsx';
import { installImageRepair } from './utils/imageRepair.ts';
import './index.css';

installImageRepair();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminProvider>
      <App />
    </AdminProvider>
  </StrictMode>,
);
