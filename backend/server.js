import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json()); // parses incoming JSON request bodies

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/search", searchRoutes);

app.get("/", (req, res) => {
  res.send("AI Research Assistant API - Phase 1 (Auth + Upload) is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
