import * as Sentry from "@sentry/node";

// Centralized place to record errors: logs to the console (which Render
// captures and shows in its dashboard - real, free, basic monitoring with
// zero setup) AND reports to Sentry if it's configured, with full stack
// trace and context.
//
// Routes call this in their catch blocks INSTEAD of a bare console.error,
// because Sentry's automatic Express error handler only catches errors
// that flow through next(err) - it never sees errors that a route
// catches internally and responds to manually, which is the pattern
// every route in this app uses. Without calling this explicitly, Sentry
// would be installed but would capture nothing.
export function logError(error, context = {}) {
  console.error("Error:", error.message, context);
  Sentry.captureException(error, { extra: context });
}