# VillageMart Project Analysis

## 1) High-level architecture
- **Monorepo structure** with a TypeScript React frontend (`frontend/`) and an Express + TypeScript backend (`backend/`).
- Root scripts orchestrate both apps concurrently for local development.
- Backend exposes REST endpoints for users, orders, notifications, profile, OTP/forgot password, and Google auth.

## 2) What is working well
- Backend and frontend production builds run successfully in this environment.
- API route organization is straightforward and readable.
- Backend computes order totals server-side (good trust boundary for pricing).

## 3) Key risks found (priority order)

### Critical
1. **Hardcoded database fallback credentials in source** (`backend/src/db.ts`).
   - If environment variables are missing, app falls back to real-looking credentials in code.
   - Recommendation: remove sensitive defaults and fail fast when env vars are absent.

2. **Admin access is implemented in frontend-only logic** (`frontend/src/router.tsx`, `frontend/src/pages/Login.tsx`).
   - Admin route guard checks `user?.username === "Mohan"`.
   - There is also a hardcoded username/password shortcut for admin login.
   - Recommendation: enforce admin authorization server-side with signed tokens and role claims.

3. **No backend-issued auth token/session in standard login flow** (`backend/src/controllers/user.Controller.ts`).
   - Login returns user object; frontend stores it directly in `localStorage`.
   - Recommendation: issue JWT (short-lived access token + refresh token) and validate on protected API routes.

### High
4. **Backend CORS is fully open** (`backend/src/server.ts`).
   - `app.use(cors())` allows all origins by default.
   - Recommendation: restrict origins by environment.

5. **Repository hygiene: generated and dependency artifacts are tracked**.
   - `node_modules` and build output (`dist/`, zip files) are tracked in git.
   - Recommendation: add and enforce `.gitignore`, remove generated artifacts from version control.

### Medium
6. **Frontend API base URL is hardcoded to production domain** (`frontend/src/api.ts`).
   - Makes local/staging setup fragile and risky.
   - Recommendation: use `import.meta.env` (`VITE_API_BASE_URL`) with environment-specific values.

7. **Frontend linting quality debt**.
   - Lint currently reports many `any` types and several hook dependency/style issues.
   - Recommendation: introduce shared app/domain types, reduce `any`, and fix hook dependency warnings.

8. **Large frontend bundle warning**.
   - Current build reports a JS chunk >500kB after minification.
   - Recommendation: route-level code splitting and optional manual chunking.

## 4) Suggested execution plan
1. **Security baseline first**
   - Remove hardcoded credentials.
   - Add token-based auth and backend role middleware.
   - Remove frontend admin shortcut and client-only admin trust.
2. **Configuration and environment cleanup**
   - Move API URLs and CORS config to env variables.
   - Add `.env.example` files for frontend/backend.
3. **Repository cleanup**
   - Add `.gitignore`.
   - Untrack `node_modules`, `dist`, and archive files.
4. **Code quality hardening**
   - Fix lint errors incrementally by feature area.
   - Add minimal automated API tests for auth/order critical paths.

## 5) Commands executed for this analysis
- `npm run -s build --prefix backend` ✅
- `npm run -s build --prefix frontend` ✅ (with chunk-size warning)
- `npm run -s lint --prefix frontend` ❌ (existing lint errors)

