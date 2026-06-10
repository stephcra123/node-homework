# Assignment 10 — Video Notes
 
## 1. How do you connect a React frontend to your Node.js backend API?
 
The front end connects to the back end through a Vite proxy configured in `vite.config.js`. Any request to `/api` is forwarded to the target URL set in `VITE_TARGET` in `.env.local`. This means the front end never hard-codes the back end URL — switching between local and production is just changing one environment variable.
 
**API calls with credentials**: the front end uses `fetch` with `credentials: "include"` so the browser automatically sends the JWT cookie on every request. No manual cookie handling needed.
 
**Authentication flow**: the user fills in the register or logon form, the front end POSTs to `/api/users/register` or `/api/users/logon`, and the back end responds with a `csrfToken` in the body and sets the JWT as an HttpOnly cookie. The front end stores the `csrfToken` in memory and attaches it as an `X-CSRF-TOKEN` header on any subsequent write requests (POST, PATCH, DELETE).
 
**CSRF token handling**: because the JWT is in an HttpOnly cookie the browser can't read it, so a malicious site can't steal it. The CSRF token in the response body is only accessible to the legitimate front end. Every write operation sends both the cookie (automatic) and the CSRF header (explicit), and the back end validates that they match before processing the request.
 
---
 
## 2. What are the key steps in deploying a Node.js application to the cloud?
 
**Database — Neon.tech**
Created a free PostgreSQL database on Neon.tech and updated `DATABASE_URL` in `.env` to point at the Neon connection string. Ran `npx prisma migrate deploy` locally to apply migrations to the cloud database before deploying the app.
 
**Render.com configuration**
- Connected the GitHub repository `stephcra123/node-homework`
- Branch: `assignment10`
- Build Command: `npm install --production && npx prisma migrate deploy`
- Run Command: `npm start`
- AutoDeploy: off
- Instance type: Free
- Environment variables added: `DATABASE_URL`, `JWT_SECRET`, `RECAPTCHA_SECRET`, `RECAPTCHA_BYPASS`
The build command installs only production dependencies and runs migrations against the Neon database on every deploy, so the schema is always in sync.
 
**Live application**
The deployed app is live at `https://node-homework-bo1b.onrender.com`. Hitting the root returns `{"message":"Hello, World!"}` confirming the server is running.
 
---
 
## 3. How do you test and validate a deployed application?
 
**Postman testing**
Updated the `urlBase` Postman environment variable to `https://node-homework-bo1b.onrender.com` and ran through all API operations — register, logon, create task, update task, delete task, logoff — with the local server stopped to confirm all requests go to Render.
 
**Front end testing**
Updated `VITE_TARGET` in `node-essentials-front-end/.env.local` to the Render URL and ran the front end locally pointing at the live back end. Tested the full flow: register a new user, logon, create and manage tasks, logoff.
 
**Checking deployment logs**
Render's log view shows real-time output from the server. Key things to check: the build log for `Build successful`, the deploy log for `Server is listening on port`, and any runtime errors. The first failure was a truncated build command (`deplo` instead of `deploy`) caught immediately in the log. The second failure was `Cannot find module 'pg'` because `pg` was in `devDependencies` — fixed by moving it to `dependencies`.
 
**Local vs production differences**
- `secure` cookie flag is `false` locally, `true` in production behind HTTPS
- `DATABASE_URL` points to local Postgres locally, Neon.tech in production
- `NODE_ENV` is not set locally but is `production` on Render, which affects cookie flags and other environment checks
- reCAPTCHA uses the bypass header locally and in tests; the real Google widget is used in production