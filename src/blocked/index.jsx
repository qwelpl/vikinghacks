import React from 'react';
import { createRoot } from 'react-dom/client';
import BlockedPage from './BlockedPage';
import './styles/blocked.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<BlockedPage />);
