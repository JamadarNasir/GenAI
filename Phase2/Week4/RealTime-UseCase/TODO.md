# TODO — KubeAI Debug Agent (Tracked Tasks & Acceptance Criteria)

This file lists the project's tracked tasks with explicit acceptance criteria so progress is verifiable.

1. Scaffold repo (in-progress)
   - Files: `frontend/package.json`, `frontend/src/index.jsx`, `backend/package.json`, `backend/src/index.js`
   - Acceptance criteria: running `npm start` in `backend/` returns 200 at `/health`; running `npm run dev` in `frontend/` serves the app and `/health` returns 200.

2. Backend APIs (not-started)
   - Files: `backend/src/routes/auth.js`, `backend/src/routes/cluster.js`, `backend/src/routes/pods.js`, `backend/src/routes/debug.js`, `backend/src/services/LLMService.js`
   - Acceptance criteria: endpoints `/api/auth/login`, `/api/cluster`, `/api/pods`, `/api/debug/analyze` respond with documented JSON stubs and correct HTTP status codes (200/201/400/401 as appropriate).

3. Database + Migrations (not-started)
   - Files: `backend/ormconfig.js`, `backend/migrations/001-init.js`, `backend/src/models/User.js`, `backend/src/models/DebugSession.js`
   - Acceptance criteria: migrations run successfully and create tables `users`, `clusters`, `debug_sessions`; backend connects using env vars and logs successful DB connection.

4. Frontend flows (not-started)
   - Files: `frontend/src/pages/Login.jsx`, `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/Debug.jsx`, `frontend/src/api/client.js`
   - Acceptance criteria: UI allows stubbed login, shows cluster/pod list fetched from backend, and can call `/api/debug/analyze` and display the returned result.

5. Containerize & K8s (not-started)
   - Files: `backend/Dockerfile`, `frontend/Dockerfile`, `k8s/backend-deployment.yaml`, `k8s/frontend-deployment.yaml`, `k8s/postgres-deployment.yaml`
   - Acceptance criteria: `docker build` succeeds for backend and frontend images; `kubectl apply -f k8s/` creates deployments and services (given a working cluster and secrets).

6. Security & Secrets (not-started)
   - Files: `backend/config/.env.example`, `backend/src/middleware/auth.js`, `backend/src/services/SecretsService.js`
   - Acceptance criteria: protected routes require JWT; `.env.example` documents required env vars; kubeconfig storage uses an encryption helper and decrypts on read.

7. Docs & CI (not-started)
   - Files: `README.md`, `frontend/README.md`, `backend/.github/workflows/ci.yml`
   - Acceptance criteria: README contains clear run/build/deploy steps; CI workflow lints and runs unit tests on PRs.

8. Tests & Linting (not-started)
   - Files: `backend/tests/`, `frontend/tests/`, `.eslintrc.js`, `jest.config.js`
   - Acceptance criteria: `npm test` executes unit tests and returns exit code 0 for passing tests; ESLint shows zero critical errors on staged files.

9. Review & Demo (not-started)
   - Files: `README.md` (demo section)
   - Acceptance criteria: demo checklist passes: start services locally, authenticate, list cluster and pods, run a debug analyze request, and view LLM response in UI.

---
Next step: confirm preferred LLM provider and auth method (I'll use sensible defaults OpenAI + JWT if you don't specify), then I will scaffold the repo and update task statuses.
