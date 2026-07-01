import express from "express";
import multer from "multer";
import Document from "../models/Document.js";
import Chunk from "../models/Chunk.js";
import { protect } from "../middleware/authMiddleware.js";
import { extractText } from "../utils/textExtractor.js";
import { chunkText } from "../utils/chunker.js";
import { embedBatch } from "../utils/embeddings.js";
import { logError } from "../utils/logger.js";

const router = express.Router();

// Multer config: stores uploaded files on local disk under /uploads.
// In a real cloud deployment you'd swap this storage engine for something
// like AWS S3 - the rest of the app won't need to change, which is the
// point of separating "storage" from "business logic."
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB cap for now
});

// POST /api/documents/upload  (protected, multipart/form-data, field name "file")
router.post("/upload", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const doc = await Document.create({
      user: req.user._id,
      originalName: req.file.originalname,
      storedPath: req.file.path,
      mimeType: req.file.mimetype,
      status: "processing",
    });

    // Extract -> chunk -> embed -> store. This is the full document
    // processing pipeline. Done synchronously (inside the request) for
    // clarity in this learning project. In a production system this would
    // be offloaded to a background job/queue, since embedding a large
    // document can take a while and you don't want to hold an HTTP
    // connection open for it.
    try {
      const text = await extractText(req.file.path, req.file.mimetype);

      // Guard against scanned/image-based PDFs that have no real text layer -
      // pdf-parse can only read text that's actually embedded in the file,
      // not pixels. Without this check, those uploads silently end up
      // "ready" with 0 chunks, which is confusing to debug later.
      if (!text || text.trim().length < 20) {
        throw new Error(
          "No extractable text found - this file may be a scanned/image-based PDF (needs OCR, not yet supported)"
        );
      }

      doc.extractedText = text;

      const textChunks = chunkText(text); // step 1: split into overlapping pieces
      const embeddings = await embedBatch(textChunks); // step 2: vectorize each piece

      const chunkDocs = textChunks.map((chunkStr, idx) => ({
        document: doc._id,
        user: req.user._id,
        text: chunkStr,
        embedding: embeddings[idx],
        chunkIndex: idx,
      }));

      await Chunk.insertMany(chunkDocs); // step 3: store in the vector collection

      doc.chunkCount = chunkDocs.length;
      doc.status = "ready";
      await doc.save();
    } catch (extractErr) {
      doc.status = "failed";
      doc.processingError = extractErr.message;
      await doc.save();
      logError(extractErr, {
        route: req.originalUrl,
        stage: "document-processing",
        documentId: doc._id,
      });
    }

    res.status(201).json(doc);
  } catch (error) {
    logError(error, { route: req.originalUrl });
    res.status(500).json({ message: error.message });
  }
});

// GET /api/documents - list current user's documents
router.get("/", protect, async (req, res) => {
  const docs = await Document.find({ user: req.user._id })
    .select("-extractedText -chunks") // keep list responses light
    .sort({ createdAt: -1 });
  res.json(docs);
});

// GET /api/documents/:id - get one document with full extracted text
router.get("/:id", protect, async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, user: req.user._id });
  if (!doc) return res.status(404).json({ message: "Document not found" });
  res.json(doc);
});

export default router;