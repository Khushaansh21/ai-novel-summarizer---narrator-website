# Project Title

**Booknarrator (Book Narrator)**

## Brief One Line Summary

Upload a PDF book, get a story-like summary using **Gemini**, and listen to it with your browser’s **text-to-speech**.

## Overview

This project has two parts:

- `frontend/`: a React website where users upload a PDF and listen to narration
- `backend/`: an Express server that reads the PDF, summarizes it with Gemini, and sends results back to the frontend

## Problem Statement

Reading long PDF books takes time. This app helps by:

- extracting the text from a PDF,
- turning it into a clear summary (about **700–800 words**),
- and letting you listen to the summary as audio.

## Dataset

There is **no fixed dataset**.

- The “data” is the **PDF file you upload**.
- The backend extracts text from the PDF using PDF.js.

## Tools and Technologies

- **Frontend**: React, Vite, Tailwind CSS, Axios
- **Backend**: Node.js, Express, Multer (file upload), Axios, PDF.js (`pdfjs-dist`)
- **AI**: Gemini API
- **Audio**: Web Speech API (browser text-to-speech)

## Methods

High-level steps:

1. **Upload PDF** from the frontend (`POST /upload-book`)
2. Backend **extracts text** from the PDF
3. Backend **splits the book into chunks** (about 2000–4000 words each)
4. Backend **selects chunks**:
   - If `USE_EMBEDDINGS=true`: uses embeddings + ranking (more API calls)
   - If `USE_EMBEDDINGS=false`: samples ~10 chunks across the book (recommended for free tiers)
5. Backend asks Gemini to **summarize each selected chunk**
6. Backend asks Gemini to **combine summaries into one structured result**:
   - `shortSummary` is guided to be **700–800 words**
   - plus `keyIdeas`, `mainLessons`, `chapterHighlights`
7. Frontend shows the summary and the browser narrates it.

## Key Insights

- Splitting big PDFs into chunks makes summarization more reliable.
- Reducing the number of model calls helps avoid Gemini **429 rate limit** errors.
- Using the browser’s speech engine keeps audio simple (no extra audio server needed).

## Dashboard/Model/Output

**Frontend output includes:**

- Final book summary (700–800 words target)
- Optional section-by-section summaries (expandable)
- Audio narration controls (Play / Pause / Stop)
- Voice selection (depends on your OS/browser)

**Backend output (JSON) includes:**

- `summary` (same as `shortSummary`)
- `shortSummary`
- `chunkSummaries`
- `keyIdeas`, `mainLessons`, `chapterHighlights`
- `narrationScript`

## How to Run this project?

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Create `backend/.env`:

```env
GEMINI_API_KEY=YOUR_KEY_HERE

# Optional (defaults)
GEMINI_MODEL=models/gemini-2.5-flash
GEMINI_EMBED_MODEL=models/gemini-embedding-001

# Recommended to avoid 429 on free tiers
USE_EMBEDDINGS=false

# Optional
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

Note: the frontend calls the backend at `http://localhost:4000` (see `frontend/src/services/api.js`).

## Results & Conclusion

- The app can summarize a PDF book into a readable, story-like summary.
- The summary is designed to be **audio-friendly**.
- With `USE_EMBEDDINGS=false`, it works more smoothly on limited/free API quotas.

## Future Work

- Add a proper environment variable on the frontend for backend URL (`VITE_API_BASE_URL`)
- Add streaming summaries (show text while the model is generating)
- Add OCR support for scanned PDFs (image-only PDFs)
- Add user accounts + save summaries
- Improve “chapter-like” splitting using headings detection

## Security notes

- Do **not** commit API keys.
- Keep `backend/.env` out of git (add `.env` to `.gitignore`).
