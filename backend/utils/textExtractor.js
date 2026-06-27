import fs from "fs";
import pdfParse from "pdf-parse";

// Phase 1: PDF only. In v1 we'll add DOCX (mammoth), images (OCR via tesseract),
// and plain text - but every format funnels into this same "give me raw text" step.
export const extractText = async (filePath, mimeType) => {
  if (mimeType === "application/pdf") {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (mimeType === "text/plain") {
    return fs.readFileSync(filePath, "utf-8");
  }

  // Unsupported type for now - v1 will add docx/images/audio handlers here
  throw new Error(`Unsupported file type: ${mimeType}`);
};
