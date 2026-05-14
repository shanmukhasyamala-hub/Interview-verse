<<<<<<< HEAD
# InterviewVerse AI

Modern AI-powered mock interview platform (React + Tailwind + Node/Express).

This repo supports:
- **Local/offline mode (default)**: local JWT auth + local JSON storage + local resume uploads + **stubbed AI & STT** (no keys needed)
- **Cloud mode (optional)**: Firebase Auth + OpenAI/Gemini + Whisper transcription

## Features (MVP)
- User authentication
- Resume upload + profile summary
- AI-generated interview questions (stubbed locally; OpenAI/Gemini in cloud mode)
- Voice-based interview interaction (record → STT; stubbed locally; Whisper in cloud mode)
- Adaptive follow-up questions
- Feedback + scores (confidence, communication, technical, overall)
- Analytics dashboard with progress tracking
- Dark futuristic UI (glassmorphism + gradients)

---

## 1) Prerequisites
- Node.js 18+
- (Optional, cloud mode only) Firebase project + OpenAI/Gemini keys

---

## 2) Configure Firebase (optional — cloud mode only)
1. Create a Firebase project.
2. Enable **Authentication**:
   - Email/Password
   - (Optional) Google provider
3. Create **Firestore** database (in production or test mode).
4. Enable **Storage**.
5. Create a **Web App** in Firebase and copy the config values into the client `.env`.
6. Create a **Service Account** for the server:
   - Firebase console → Project settings → Service accounts → Generate new private key

---

## 3) Environment variables

### Client
Copy `.env.example` → `.env` (optional).
- For local mode you can skip this entirely.
- If you do create it, set:
  - `VITE_AUTH_MODE=local`
  - `VITE_API_BASE_URL=http://localhost:5175`

Cloud mode:
- Set `VITE_AUTH_MODE=firebase` and fill `VITE_FIREBASE_*`

### Server
Copy `server/.env.example` → `server/.env` and fill in:
Local mode (default):
- `AUTH_MODE=local`
- (Optional) `JWT_SECRET`

Cloud mode:
- `AUTH_MODE=firebase`
- `OPENAI_API_KEY` (required for Whisper STT endpoint)
- `GEMINI_API_KEY` (optional fallback)
- `FIREBASE_SERVICE_ACCOUNT_JSON` (paste JSON as one line) **or** `FIREBASE_SERVICE_ACCOUNT_BASE64`

---

## 4) Run locally

From the project root:
```bash
npm install
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:5175/health

---

## Notes
Local mode:
- Data is stored in `server/data/db.json`
- Resume files are saved in `server/uploads/` and served from `/uploads/*`
- AI + STT are stubbed (so you can demo the full UX offline)

Cloud mode:
- Whisper transcription expects audio in `webm` from the browser MediaRecorder.
=======
# Interview-verse
>>>>>>> 7f223e8f9d3db81f46445bd382457034bb332a56
