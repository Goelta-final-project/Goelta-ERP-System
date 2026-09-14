import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';
import './styles.css';

const theme = createTheme({
  palette: { primary: { main: '#1264a3' }, secondary: { main: '#f2a93b' }, background: { default: '#f5f7fa', paper: '#ffffff' } },
  typography: { fontFamily: '"DM Sans", "Segoe UI", sans-serif', h1: { fontFamily: '"Space Grotesk", sans-serif' }, h2: { fontFamily: '"Space Grotesk", sans-serif' }, h3: { fontFamily: '"Space Grotesk", sans-serif' }, h4: { fontFamily: '"Space Grotesk", sans-serif' } },
  shape: { borderRadius: 10 },
});

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><ThemeProvider theme={theme}><CssBaseline /><App /></ThemeProvider></BrowserRouter></React.StrictMode>);
