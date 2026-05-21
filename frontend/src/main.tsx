import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializeSentry } from './lib/sentry';
import './index.css';

// Initialize Sentry for error tracking and performance monitoring
initializeSentry();

const SentryApp = Sentry.withProfiler(App);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SentryApp />
    </ErrorBoundary>
  </React.StrictMode>
);
