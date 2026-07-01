# AI Research Assistant

A full-stack AI-powered research assistant that lets you upload documents and chat with them using RAG (Retrieval-Augmented Generation) and agentic tool calling. Think Perplexity + NotebookLM, built from scratch.

**Live demo:** https://ai-research-assistant-fawn.vercel.app

---

## What it does

- Upload PDFs or text files — they get extracted, chunked, and embedded locally
- Ask questions in natural language — the AI agent searches your documents, the web, or does calculations depending on what's needed
- Every answer includes citations (which document and chunk it came from) and shows which tools were called
- Automatic model fallback: if the primary Gemini model hits a rate limit, it silently falls back to the next in the chain

---

## Architecture

```
React (Vite) → Vercel
      │
      ▼
Node.js / Express REST API → Render
      │
      ├── MongoDB Atlas (users, documents, chunks)
      │       └── Vector Search Index (cosine similarity, 384 dims)
      │
      ├── Local Embeddings (@xenova/transformers, all-MiniLM-L6-v2)
      │
      ├── Gemini API (agent reasoning + tool calling)
      │       └── Model fallback chain: 3.1-flash-lite → 2.5-flash → 2.5-flash-lite
      │
      ├── Tavily API (web search tool)
      │
      └── Sentry (error tracking + monitoring)
```

### Document pipeline (on upload)
```
PDF/TXT → extract text → clean → chunk (250 words, 40-word overlap)
        → embed locally (384-dim vectors) → store in MongoDB Atlas Vector Search
```

### Agent loop (on chat message)
```
User question → agent decides which tool(s) to call
             → search_my_documents | web_search | calculate
             → execute tool, feed result back to model
             → repeat until model responds with plain text
             → return answer + tool trace + citations
```

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, React Router |
| Backend | Node.js, Express, ESM |
| Database | MongoDB Atlas, Mongoose |
| Vector Search | MongoDB Atlas Vector Search (cosine similarity) |
| Embeddings | @xenova/transformers (all-MiniLM-L6-v2, runs locally in Node) |
| LLM | Google Gemini API (gemini-2.5-flash, function calling) |
| Web Search | Tavily API |
| Auth | JWT + bcrypt |
| File handling | Multer, pdf-parse |
| Containerization | Docker, docker-compose (multi-stage frontend build with nginx) |
| CI/CD | GitHub Actions (install, build, Docker image build on every push) |
| Deployment | Render (backend), Vercel (frontend) |
| Monitoring | Sentry (error tracking), structured request logging, /api/health endpoint |

---

## Project structure

```
ai-research-assistant/
├── .github/workflows/
│   └── ci.yml                    # CI: install, build, Docker on every push
├── backend/
│   ├── config/db.js              # MongoDB Atlas connection
│   ├── models/
│   │   ├── User.js               # bcrypt pre-save hook
│   │   ├── Document.js           # upload metadata + processing status
│   │   └── Chunk.js              # text chunks + 384-dim embedding vectors
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verify, attaches req.user
│   │   └── requestLogger.js      # structured request logging (method, path, status, ms, userId)
│   ├── routes/
│   │   ├── authRoutes.js         # register, login, profile
│   │   ├── documentRoutes.js     # upload → extract → chunk → embed pipeline
│   │   ├── searchRoutes.js       # semantic search via Atlas Vector Search
│   │   └── chatRoutes.js         # agent loop entry point
│   ├── utils/
│   │   ├── textExtractor.js      # PDF/TXT → raw text
│   │   ├── chunker.js            # overlapping word-based chunking
│   │   ├── embeddings.js         # local embedding model (no API key)
│   │   ├── retrieval.js          # shared vector search logic
│   │   ├── agent.js              # Gemini agent loop + model fallback chain
│   │   ├── tools.js              # tool declarations + execution (search_my_documents, web_search, calculate)
│   │   └── logger.js             # centralized Sentry + console error logging
│   ├── instrument.js             # Sentry init (must load before all other imports)
│   ├── server.js                 # Express app, middleware, routes, health check
│   ├── Dockerfile                # production Node image
│   └── .env.example              # all required env vars documented
├── frontend/
│   ├── src/
│   │   ├── api/axios.js          # axios instance, JWT interceptor, env-based base URL
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx     # upload + semantic search
│   │   │   └── Chat.jsx          # agent chat UI with tool trace + citations
│   │   └── App.jsx               # routing + protected routes
│   ├── Dockerfile                # multi-stage: Node build → nginx serve
│   └── nginx.conf                # SPA fallback for React Router
└── docker-compose.yml            # local orchestration (backend + frontend)
```

---

## Local setup

### Prerequisites
- Node.js 22+
- Docker Desktop (optional, for containerized run)
- MongoDB Atlas free cluster
- Google AI Studio API key (free)
- Tavily API key (free, 1000 searches/month)
- Sentry DSN (free, optional — app works without it)

### 1. Clone and install
```bash
git clone https://github.com/maruthipratap/ai-research-assistant.git
cd ai-research-assistant

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment
```bash
cd backend
cp .env.example .env
# Fill in: MONGO_URI, JWT_SECRET, GEMINI_API_KEY, TAVILY_API_KEY, SENTRY_DSN
```

### 3. MongoDB Atlas Vector Search index
In Atlas UI → your cluster → Atlas Search → Create Search Index → JSON Editor:
- Collection: `chunks`
- Index name: `vector_index`
```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 384, "similarity": "cosine" }
  ]
}
```

### 4. Run (standard)
```bash
# Terminal 1
cd backend && npm run dev   # http://localhost:5000

# Terminal 2
cd frontend && npm run dev  # http://localhost:5173
```

### 5. Run (Docker)
```bash
docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

---

## Key design decisions

**Why chunks in a separate collection, not nested in documents?**
Each chunk needs its own vector field for Atlas Vector Search to index. Nesting arrays of embeddings inside documents doesn't match the standard vector DB pattern (one record = one vector), and would make post-filter queries harder.

**Why local embeddings instead of OpenAI's API?**
Zero API cost, no latency on calls, no dependency on a third-party service for a core pipeline step. `all-MiniLM-L6-v2` via transformers.js runs in Node as ONNX — 384-dim vectors, ~90MB one-time download, suitable for semantic similarity at this scale.

**Why post-filter instead of pre-filter in vector search?**
Simpler to implement and explain. The tradeoff: pre-filter (adding `user` to the index definition) is faster at scale since it reduces candidates before the ANN search; post-filter (what we do) applies the user constraint after retrieval. Fine at this scale, worth knowing the difference.

**Why automatic model fallback?**
Gemini's free tier has per-model daily quotas. Rather than surfacing a 429 error to the user, the agent silently retries with the next model in the chain (`gemini-3.1-flash-lite → gemini-2.5-flash → gemini-2.5-flash-lite`). Only quota errors trigger fallback — real errors still fail loudly.

**Why explicit `Sentry.captureException` instead of relying on the Express error handler?**
Sentry's automatic Express middleware only catches errors that flow through `next(err)`. Our routes catch errors internally and respond directly (the standard Express pattern for JSON APIs), so a centralized `logError()` utility explicitly calls `captureException` in every catch block.

---

## API reference

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Login, returns JWT |
| GET | `/api/auth/profile` | ✅ | Get current user |
| POST | `/api/documents/upload` | ✅ | Upload PDF/TXT → full processing pipeline |
| GET | `/api/documents` | ✅ | List user's documents |
| GET | `/api/documents/:id` | ✅ | Get one document |
| POST | `/api/search/semantic` | ✅ | Vector similarity search across user's chunks |
| POST | `/api/chat` | ✅ | Run agent loop, returns answer + tool trace + citations |
| GET | `/api/health` | ❌ | Uptime check |

---

## Concepts demonstrated

**NLP / ML**
- Text extraction from PDFs, tokenization concepts, word-based chunking with overlap
- Dense vector embeddings (sentence transformers, 384-dim, cosine similarity)
- Semantic search vs keyword search
- RAG pipeline: retrieval → augmented prompting → generation

**LLM / GenAI**
- Prompt engineering: system instructions, grounding rules, date injection, anti-hallucination constraints
- Tool/function calling (Gemini's `functionDeclarations` + `functionResponse` pattern)
- Agentic reasoning loop: model decides → tool executes → result fed back → repeat
- Multi-turn conversation memory via history array
- Model fallback chain for resilience

**Production engineering**
- JWT stateless auth, bcrypt password hashing
- MongoDB Atlas Vector Search (cosine similarity index)
- Docker multi-stage builds (Node build → nginx serve for frontend)
- GitHub Actions CI (install, build, Docker image build on every push)
- Cloud deployment split: Render (API server) + Vercel (static frontend)
- Sentry error tracking with explicit `captureException` integration
- Structured request logging middleware
- Environment-based configuration, secrets never committed
