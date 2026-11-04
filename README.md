<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1hiDR6gSyNZc57BjIkFC2RaVMAXLz1hyk

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies in both projects:
   `npm install` and `cd server && npm install`
2. Configure the API in `server/.env` (database, `JWT_SECRET`, `ENCRYPTION_KEY` and the AI provider
   key). The AI is only called from the server: the browser never holds a provider key.
3. Run the API (`cd server && npm run dev`, port 3001) and the app (`npm run dev`, port 3000).

Commands, architecture and gotchas are in `CLAUDE.md`.
