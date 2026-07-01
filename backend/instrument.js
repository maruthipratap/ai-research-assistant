// This file must be imported FIRST, before anything else, in server.js.
// Sentry needs to initialize before other modules load so it can
// automatically instrument them.
import dotenv from "dotenv";
dotenv.config();
// Loading dotenv here (not just in server.js) matters because of the same
// ES-modules ordering issue we hit earlier with the OpenAI key: imports
// are evaluated before the importing file's own code runs, so if we read
// process.env.SENTRY_DSN below without loading .env first, it would
// always be undefined in local dev.

import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    // Sentry's free tier has a monthly event quota - sampling half of
    // transactions instead of all of them (1.0) makes that quota last
    // much longer while still giving useful performance data.
    tracesSampleRate: 0.5,
  });
  console.log("Sentry error tracking enabled");
} else {
  console.log("SENTRY_DSN not set - error tracking disabled (fine for local dev)");
}