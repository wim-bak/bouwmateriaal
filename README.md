# Bouwmateriaal AI Lab

Interactieve tool die per bouwmateriaal 5 concrete AI-kansen genereert met marktcontext.

Stack: React + Vite frontend, Express serverless op Vercel, Turso (libSQL) database, Anthropic Claude voor generatie, Resend voor mail.

## Lokaal draaien

```bash
npm install
cp .env.example .env
# Vul .env met Turso, Anthropic en Resend keys
npm run dev
```

Open http://localhost:5000

## Deploy naar Vercel

1. Push naar GitHub
2. In Vercel: Import Git Repository, selecteer deze repo
3. Vercel detecteert `vercel.json` automatisch
4. Voeg environment variables toe (zie `.env.example`)
5. Deploy

## Environment variables

Zie `.env.example` voor alle vereiste keys.

## Database

Schema wordt automatisch aangemaakt bij eerste request via `ensureSchema()` in `server/storage.ts`.
