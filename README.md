# Domino Tournament App

Manages domino tournaments: player sign-up, table rotations (random / Swiss), score entry with opponent confirmation, live individual and team standings, and tournament history.

Live at **domino.joelbary.com** (hosted on Render, database on Render Postgres).

## How updates go live
1. Code changes are saved in this folder.
2. In GitHub Desktop: write a short summary → **Commit to main** → **Push origin**.
3. Render sees the new code on GitHub and redeploys automatically (about 2–4 minutes).

## Render settings
- Build command: `npm install && npm run build`
- Start command: `npm start` (applies database updates, then starts the app)
- Environment variable: `DATABASE_URL` = the database's Internal Database URL
- Health check path: `/domino/api/health` (also works as `/api/health`)
