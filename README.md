<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Timbangin

Timbangin is a Vite + React decision-intelligence app. The browser app calls `/api/ai`; Gemini/SumoPod provider keys must stay server-side in Vercel environment variables.

## Security notes

- Do **not** expose AI provider keys with a `VITE_` prefix.
- Do **not** inject `process.env.GEMINI_API_KEY` through `vite.config.ts`; Vite builds are browser bundles.
- AI calls are routed through `api/ai.ts`, which applies:
  - POST-only access
  - origin/referrer allowlist
  - best-effort per-IP rate limiting
  - request size limits
  - input length clamping
- Firebase config in `firebase-applet-config.json` is public client config; protect user data with Firebase Auth and Firestore rules.

## Run locally

**Prerequisite:** Node.js

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy env example and set the server-only key:

   ```bash
   cp .env.example .env.local
   ```

3. For local API-route testing, run with Vercel dev so `/api/ai` is available:

   ```bash
   npx vercel dev
   ```

4. For frontend-only development, Vite still works, but AI requests need the API route:

   ```bash
   npm run dev
   ```

## Build and verify

```bash
npm run lint
npm run build
```

After building, confirm the browser bundle does not contain AI provider secrets or `@google/genai` client code.
