// MUST be the very first import - Sentry needs to initialize before any
// other module loads so it can automatically instrument them.
import "./instrument.js";

import express from "express";
import cors from "cors";
import * as Sentry from "@sentry/node";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { logError } from "./utils/logger.js";

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Standard uptime-check endpoint - load balancers, uptime monitors
// (UptimeRobot, etc.), and platforms like Render use endpoints like this
// to verify a service is actually alive, not just that the process exists.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/chat", chatRoutes);

// Temporary route to confirm Sentry is actually working end-to-end - hit
// this once after deploying, confirm the error shows up in your Sentry
// dashboard, then feel free to delete this route.
app.get("/api/debug-sentry", () => {
  throw new Error("Test error - confirming Sentry is wired up correctly");
});

// Must be registered AFTER all routes/controllers, but before any other
// error-handling middleware (we don't have any others, so it goes last).
//Sentry.setupExpressErrorHandler(app);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));