import React from 'react';
import ReactDOM from 'react-dom/client';
import ChoresChart from './ChoresChart';
import './firebase';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ChoresChart />
  </React.StrictMode>
);