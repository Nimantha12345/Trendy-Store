import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';

// 1. මුලින්ම root එක සාදාගත යුතුයි
const root = ReactDOM.createRoot(document.getElementById('root'));

// 2. ඉන්පසුව render කළ යුතුයි
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();