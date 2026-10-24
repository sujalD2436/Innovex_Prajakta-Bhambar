# First code-push checklist — FastAPI edition

The PDF schedules the first code push for **24 Oct 2026, 12:00 PM–3:00 PM IST**.

## Before push

- [ ] `server_py/.env` created (with 32+ character JWT secret and working MongoDB URI)
- [ ] `python -m pip install -r server_py/requirements.txt` succeeds in a Python virtualenv
- [ ] `npm install` succeeds
- [ ] MongoDB is running and `npm run seed` completes
- [ ] `npm run dev` starts FastAPI on port 5000 and Vite on port 5173
- [ ] `http://localhost:5000/api/health` returns `status: ok`
- [ ] `http://localhost:5000/docs` displays FastAPI Swagger UI
- [ ] Organizer can create event; student can discover it
- [ ] `npm test`, `npm run build`, `npm run smoke` pass locally
- [ ] `git status` confirms no secrets or venv included

## GitHub push

```powershell
git init
git add .
git commit -m "feat: React FastAPI MongoDB EventSphere MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/eventsphere-ai.git
git push -u origin main
```

After your first verified push, prepare the two-minute demonstration video and five-slide PDF-defined PPT.
