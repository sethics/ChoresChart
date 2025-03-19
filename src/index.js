import React from 'react';
import ReactDOM from 'react-dom/client';
import ChoresChart from './ChoresChart';
import './firebase';
import './index.css';  // Import Tailwind CSS
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ChoresChart />
  </React.StrictMode>
);