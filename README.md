# EventSphere AI — React + FastAPI + MongoDB

**VECNAVERSE 2026 · Software Development · Hyperlocal Event Discovery & Community Engagement**

**Poster → AI-assisted extraction → Community discovery → Registration → QR attendance → Insights**

This is a functional *hackathon prototype source project*, not a guaranteed winning or production-ready service. It has a React UI, Python FastAPI REST backend, and MongoDB persistence. The seeded Pune events are fictional. The matching engine is a transparent rule-based algorithm, **not** trained machine learning. The OCR output requires human review.

## 1. What you will build

- Attendee/organizer signup and JWT login; profile interests
- Discover upcoming events, search, categories, nearby map and personalized event ranking
- Organizer create/publish, duplicate warnings and dashboard metrics
- Upload a PNG/JPEG poster to extract draft event data with Tesseract OCR (optional native dependency)
- Student registration + random 48-character QR ticket
- Owner-restricted QR verification with single-use check-in, manual ticket-token fallback
- Interactive API docs at **http://localhost:5000/docs**
- Six fictional demonstration events and two demo accounts

**Backend APIs remain compatible with the previous React/Express frontend. The Express `server/` directory was replaced with `server_py/`.**

## 2. Requirements

- Windows 10/11 with **Python 3.11 or 3.12** and **Node.js 22.12+**, npm and VS Code
- **MongoDB** via local Windows service, Docker or MongoDB Atlas
- Internet to install Python/npm packages and load public map tiles
- Optional: native [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) for poster scanning. Event creation, search and tickets work without it.

## 3. Windows PowerShell — exact setup

Extract the ZIP and open its `eventsphere-ai` folder in VS Code. In **Terminal → New Terminal**:

### Step 1 — make a virtual environment

```powershell
py -3.12 -m venv .venv
Set-ExecutionPolicy -Scope Process Bypass
.\.venv\Scripts\Activate.ps1
python --version
```

If `py -3.12` isn't installed, use `py -3.11` or `python -m venv .venv`.

### Step 2 — install dependencies

```powershell
python -m pip install --upgrade pip
python -m pip install -r server_py\requirements.txt
npm install
```

### Step 3 — configure the backend and frontend

```powershell
Copy-Item server_py\.env.example server_py\.env
Copy-Item client\.env.example client\.env
python -c "import secrets; print(secrets.token_hex(32))"
```

Open `server_py/.env` and **replace** `JWT_SECRET=` with the generated random key. Set `MONGO_URI=` to your MongoDB URI. Leave `CLIENT_ORIGIN=http://localhost:5173`. Never share or commit `.env` files.

### Step 4 — launch MongoDB

**With Docker Desktop:**

```powershell
docker compose up -d
```

**Without Docker:** run the local MongoDB Windows service (default `mongodb://127.0.0.1:27017/eventsphere_ai`) **or** replace `MONGO_URI` with your Atlas connection URI. If Atlas, create a database user and allow your current IP in Network Access. Never commit Atlas credentials.

### Step 5 — seed and start both applications

```powershell
npm run seed
npm run dev
```

- **Frontend:** http://localhost:5173
- **FastAPI health:** http://localhost:5000/api/health (should show `"status":"ok"`)
- **Swagger UI:** http://localhost:5000/docs
- **OpenAPI specification:** http://localhost:5000/openapi.json

The `npm run dev` script starts both FastAPI using Uvicorn and React using Vite; the active Python virtual environment must be selected in that terminal.

### Demo credentials (local hackathon only)

| Role | Email | Password |
|---|---|---|
| Student | `student@eventsphere.demo` | `Demo@12345` |
| Organizer | `organizer@eventsphere.demo` | `Demo@12345` |

Do not publish a deployed service with demo accounts enabled. The seed script does not reset existing passwords.

## 4. Enable poster scanning on Windows (optional)

The Python `pytesseract` package **does not install the Tesseract executable**. Install the native Tesseract OCR program and English language data separately. You may use an available Windows installer from the [Tesseract project documentation](https://tesseract-ocr.github.io/tessdoc/Installation.html).

If `tesseract --version` works, the API should detect it automatically. Otherwise add this line to `server_py/.env` (change it to your actual path):

```dotenv
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

Restart `npm run dev`, then test with `docs/demo-poster.png` in Organizer Studio. OCR extracts editable **draft** data; verify the date/time/venue before publishing.

## 5. Test before your first GitHub push

With MongoDB and API running, use a **second PowerShell terminal** from the same folder:

```powershell
.\.venv\Scripts\Activate.ps1
npm test
npm run build
npm run smoke
```

`npm test` runs offline Python intelligence tests; `npm run build` compiles the React frontend; `npm run smoke` logs in as demo accounts and checks the API from organizer publish → student registration → ticket → ownership enforcement → check-in → replay prevention. Running the smoke test creates additional test data in MongoDB.

### First push command

Create an empty GitHub repository named `eventsphere-ai`, then:

```powershell
git init
git add .
git commit -m "feat: React FastAPI MongoDB EventSphere MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/eventsphere-ai.git
git push -u origin main
```

Replace `YOUR_USERNAME`. **Verify no `.env`, `.venv`, or secrets are staged** with `git status` before pushing. Do not claim the full integration tests passed unless they pass on your machine.

## 6. Hackathon demo sequence

1. Launch Discover with fictional seeded events; search `CodeSprint` and switch to map.
2. Login as organizer and upload `docs/demo-poster.png`; review OCR-extracted fields.
3. Create a future workshop, try duplicate check and publish.
4. Login as student, open the event, register and view `My tickets` QR.
5. Switch to organizer, use QR check-in (or paste ticket token), confirm attendance.
6. Repeat the code to show check-in replay is blocked; open organizer analytics.

See `docs/DEMO_AND_PITCH.md` for the five required slides and two-minute demo script.

## 7. Project structure

```text
eventsphere-ai/
├── client/                  React/Vite frontend (unchanged API contract)
│   └── src/                 App.jsx, api.js, styles.css
├── server_py/               Python FastAPI backend
│   ├── app/                 main.py (REST routes), security.py, database.py, intelligence.py
│   ├── tests/               offline rule-based intelligence tests
│   ├── .env.example
│   ├── requirements.txt
│   └── seed.py
├── docs/                    API reference, demo pitch, first push, sample poster
├── scripts/smoke.mjs        full-stack smoke tester (run after starting API)
├── docker-compose.yml      optional local MongoDB
├── .github/workflows/ci.yml
└── package.json            npm scripts for Python + React
```

## 8. Known prototype limitations

- JWT is stored in browser localStorage for speed: switch to hardened sessions for production.
- Rule-based recommendations indicate *interest match*, not AI-predicted outcomes.
- Duplicate check isn't a guarantee that listings are legitimate or unique.
- Registration capacity isn't transactionally protected against simultaneous requests; production requires atomic counters or MongoDB transactions.
- OCR depends on system Tesseract and image quality; uploaded images have a 4 MB limit and must be PNG/JPEG.
- Camera QR scanning depends on browser support for `BarcodeDetector`; manual code works everywhere.
- This prototype does not verify organizer identities, process payments, or scrape social networks.
- API uses synchronous PyMongo from standard FastAPI `def` endpoints, intentionally simple for a 24-hour hackathon.

## 9. Troubleshooting

- `ModuleNotFoundError: pymongo` → activate `.venv` and run `python -m pip install -r server_py\requirements.txt`.
- `Set JWT_SECRET` → copy `.env.example`, put at least 32 random characters in `server_py/.env`.
- `MongoDB connection failed` → start MongoDB or correct Atlas URI, user, password and IP allowlist.
- Port `5000` already in use → stop the other backend; this React client points to port 5000.
- OCR returns `503` → install native Tesseract OCR, set `TESSERACT_CMD` or type details manually.
- API shows `status: db-disconnected` → inspect MongoDB before testing frontend.
