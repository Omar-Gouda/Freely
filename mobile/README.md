# Freely Mobile

Cross-platform Expo client for the Freely recruitment platform.

## Environment

Copy `.env.example` to `.env` and fill in:

- `EXPO_PUBLIC_API_BASE_URL`: the deployed Next.js app URL on Vercel
- `EXPO_PUBLIC_SUPABASE_URL`: the same Supabase project URL used by the web app
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: the same Supabase anon key used by the web app

## Run

```bash
npm install
npm run start
```

## Verify

```bash
npm run typecheck
```

The mobile app uses the same Supabase auth, storage, and database-backed API routes as the website.
