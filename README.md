# Freely Recruitment SaaS

Production-shaped recruitment platform for freelance recruiters handling mass hiring with recruiter-managed screening, ATS workflows, outreach, scheduling, analytics, and secure file handling.

## Stack

- Next.js App Router with React 19
- MongoDB with a lightweight application-side data adapter
- Supabase Auth for authentication and session handling
- Supabase Storage and pluggable object storage abstraction
- Optional OpenAI provider for generated content
- MongoDB-backed background worker with retry support
- Sentry-ready monitoring and structured JSON logging

## Local setup

1. Copy `.env.example` to `.env`
2. Start infrastructure with `docker compose up -d`
3. Run `npm install`
4. Seed demo data with `npm run db:seed`
5. Start the app with `npm run dev`
6. Start the worker with `npm run worker`

## PostgreSQL to MongoDB migration

1. Keep `DATABASE_URL` pointing to the legacy PostgreSQL database
2. Set `MONGODB_URL` and `MONGODB_DB_NAME` for the target MongoDB instance
3. Run `npm run db:migrate:data`
4. Switch the app runtime to MongoDB by keeping the Mongo env values in `.env`

## Vercel deployment

### Core environment variables

- `MONGODB_URL`
- `MONGODB_DB_NAME`
- `APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `JWT_SECRET`
- `CRON_SECRET`

### Storage

- Set `STORAGE_DRIVER=supabase` on Vercel unless you intentionally use S3
- Set `SUPABASE_SERVICE_ROLE_KEY`
- Set `SUPABASE_STORAGE_BUCKET`
- Keep `NEXT_PUBLIC_SUPABASE_URL` pointed at the same Supabase project
- The app now auto-creates the Supabase bucket if it is missing and the service-role key has permission
- Use `STORAGE_DRIVER=s3` only when you also provide `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, and optional `S3_ENDPOINT`
- Do not use `STORAGE_DRIVER=local` on Vercel

### Recruiter workflow behavior

- Job posters now enter must-have and nice-to-have requirements manually
- Interviewers can complete a scorecard/checklist from the interview calendar popup
- Candidate CVs and voice notes are scheduled for purge 7 days after the candidate reaches `HIRED` or `REJECTED`
- User avatars are preserved, and replacing an avatar deletes the previous avatar asset to save storage

### AI

- `OPENAI_API_KEY` is optional and only needed when `AI_PROVIDER=openai`
- Job requirement entry no longer depends on AI extraction

### Monitoring and logging

- `NEXT_PUBLIC_SENTRY_DSN` for browser-side monitoring
- `SENTRY_DSN` for server-side monitoring
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to upload production source maps during Vercel builds
- `SENTRY_ENVIRONMENT` such as `production`, `preview`, or `staging`
- `SENTRY_TRACES_SAMPLE_RATE` such as `0.15`
- `LOG_LEVEL` such as `info`

### Deployment recommendations

- Keep the default `vercel.json` cron so `/api/internal/queue/run` continues processing scheduled cleanup and automation jobs in production
- Set `CRON_SECRET` in Vercel so the cron route is protected
- Point `APP_URL` to your production domain
- Run the health check at `/api/health` after deployment
- Add the Sentry DSNs before go-live so unhandled client and server errors are captured
- Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` if you want readable source-mapped stack traces in Sentry

## Production notes

- Rotate secrets, enforce HTTPS, and terminate TLS at the edge
- Replace the mock AI provider by setting `AI_PROVIDER=openai` only if you want generated content features
- For local or VM deployments, you can still run `npm run worker` as a separate process
- For Vercel deployments, the queue can be processed through the protected cron route instead of a long-running worker
- Every request now carries an `x-request-id` header to improve traceability in logs
