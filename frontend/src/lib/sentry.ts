import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

/**
 * Initialize Sentry for error tracking and performance monitoring
 * 
 * Requires VITE_SENTRY_DSN environment variable
 */
export function initializeSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const env = import.meta.env.VITE_APP_ENV || 'production';

  if (!dsn) {
    console.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: env,
    integrations: [
      new BrowserTracing({
        // Capture 10% of transactions
        tracingOrigins: ['localhost', /^\//],
      }),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
    tracesSampleRate: env === 'production' ? 0.1 : 1.0,
    // Set `tracePropagationTargets` to control what URLs distributed tracing should be enabled for
    tracePropagationTargets: ['localhost', /^\//],
    // Capture Replay for 10% of all sessions,
    // plus 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Release tracking
    release: `spirithub-frontend@${import.meta.env.VITE_APP_VERSION || 'unknown'}`,
  });
}

/**
 * Capture user context for error tracking
 */
export function setSentryUser(userId?: string, email?: string, username?: string) {
  if (!userId) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

/**
 * Capture breadcrumb for debugging
 */
export function captureEvent(category: string, message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    timestamp: Date.now() / 1000,
  });
}

export default Sentry;
