# AI Research Assistant — Phase 1 (Foundation Skeleton)

This is the MVP foundation for the full "AI Research Assistant" project.
**No AI yet on purpose.** This phase is just auth + MongoDB + file upload —
get this rock solid before adding embeddings, vector search, and the LLM
on top of it.

## What's in this phase

- JWT authentication (register, login, protected routes)
- Passwords hashed with bcrypt (never stored in plain text)
- MongoDB (via Mongoose) for users and documents
- File upload (PDF/TXT) with Multer
- Text extraction from uploaded PDFs (pdf-parse)
- A React (Vite) frontend: register/login pages + a dashboard to upload
  and list documents

## Concepts you can now explain in an interview

- **JWT auth**: stateless auth, signed (not encrypted) tokens, how the
  `Authorization: Bearer <token>` header works
- **Password hashing**: bcrypt salting, why hashing ≠ encryption
- **REST API design**: route structure, status codes, middleware
- **File upload handling**: multipart/form-data, server-side storage
- **Text extraction**: turning unstructured files (PDF) into plain text —
  the first step of every NLP/RAG pipeline

## Setup

### 1. MongoDB
Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas),
get your connection string.

### 2. Backend
```bash
cd backend
cp .env.example .env
# edit .env: paste your MONGO_URI, set a random JWT_SECRET
npm install
npm run dev
```
Runs on `http://localhost:5000`.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`.

### 4. Try it
1. Open `http://localhost:5173/register`, create an account
2. You'll land on the dashboard
3. Upload a small PDF or .txt file
4. Refresh — you'll see it listed with status `ready`, meaning text
   extraction succeeded (check MongoDB Atlas to see the `extractedText`
   field populated on the document)

## Phase 2 — Chunking, Embeddings, Vector Search (current)

This phase adds the real "vector database" piece. When you upload a document now:

```
Extract text → chunk it → embed each chunk locally → store in a Chunk collection
```

And a new endpoint lets you query it semantically:

```
Your question → embed it → MongoDB Atlas Vector Search finds the closest chunks → returned with scores
```

### Architecture decision worth understanding
Chunks + embeddings live in their **own `Chunk` collection**, not nested
inside `Document`. Each chunk = one document = one embedding field. This is
the standard pattern for vector databases (including Atlas Vector Search),
and it's the same shape you'd use with Pinecone, Weaviate, etc. if you
swapped vector DBs later.

### Embeddings: how they're generated
Using `@xenova/transformers` (transformers.js) with the model
`Xenova/all-MiniLM-L6-v2` — runs **locally in Node**, no API key, no cost.
It converts text into a 384-number vector. The **first** embedding call
downloads ~90MB of model weights (one-time); every call after that is fast
and fully offline.

### Required setup: create the Atlas Vector Search Index
This is a one-time manual step in the Atlas UI (can't be done from code):

1. Go to your Atlas cluster → **Atlas Search** tab → **Create Search Index**
2. Choose **JSON Editor**
3. Database: `ai-research-assistant` (or whatever your DB is named) → Collection: `chunks`
4. Index name: `vector_index` (must match exactly — the code references this name)
5. Paste this definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
      "similarity": "cosine"
    }
  ]
}
```

6. Click Create. It takes a minute or two to build.

### Try it
1. `cd backend && npm install` (pulls in transformers.js)
2. Restart the backend
3. **Re-upload a document** (old documents from Phase 1 have no chunks yet)
4. First upload will be a bit slow (model download) — watch the backend
   console log
5. Once status shows `ready`, use the new search box on the dashboard —
   try a question about something in your document
6. You'll get back the most relevant chunks with similarity scores and
   which document they came from

### Concepts you can now explain in an interview
- **Embeddings**: turning text into a fixed-length vector that captures
  meaning, so "semantically similar" text ends up "numerically close"
- **Vector database**: a database optimized for finding nearest-neighbor
  vectors at scale, instead of exact matches
- **Cosine similarity**: how "closeness" between two vectors is measured
- **Chunking**: why long documents are split before embedding, and the
  overlap tradeoff
- **Pre-filter vs post-filter** in vector search (we did post-filter here —
  know the tradeoff for the interview)

## What's next — Phase 3 (RAG Chat)

Now that semantic search works, Phase 3 adds the LLM on top:
1. Take the top chunks from `/api/search/semantic`
2. Build a prompt: system instructions + those chunks as context + the user's question
3. Call an LLM (Claude or OpenAI API)
4. Stream the answer back with citations pointing to source chunks

This is the actual "RAG" — what we have now is the "R" (retrieval); next
we add the "AG" (augmented generation).

## Project structure

```
ai-research-assistant/
├── backend/
│   ├── config/db.js               # MongoDB connection
│   ├── models/                    # User, Document, Chunk schemas
│   ├── middleware/authMiddleware.js
│   ├── routes/                    # auth, documents, search
│   ├── utils/
│   │   ├── textExtractor.js       # PDF/TXT -> raw text
│   │   ├── chunker.js             # raw text -> overlapping chunks
│   │   └── embeddings.js          # chunk -> 384-dim vector (local model)
│   └── server.js
└── frontend/
    └── src/
        ├── api/axios.js           # attaches JWT to every request
        ├── context/AuthContext.jsx
        ├── pages/                 # Login, Register, Dashboard (upload + search)
        └── App.jsx                # routing + protected routes
```
