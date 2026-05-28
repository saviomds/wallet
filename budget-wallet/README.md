This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Migrations & CI (local and CI-run)

Apply database migrations before running integration tests or deploying features that require DB changes.

Local (psql) example:

```bash
# Requires a Postgres connection string in TEST_SUPABASE_DB_CONN
export TEST_SUPABASE_DB_CONN="postgres://user:pass@host:5432/db"
for f in supabase/migrations/*.sql; do
	echo "Applying $f"
	psql "$TEST_SUPABASE_DB_CONN" -f "$f"
done
```

CI: the workflow at `/.github/workflows/ci.yml` already conditionally applies migrations when `TEST_SUPABASE_DB_CONN` is set as a secret. Provide the following secrets to enable CI integration tests:

- `TEST_SUPABASE_DB_CONN` — optional, Postgres connection string used to apply SQL migration files in CI.
- `TEST_API_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TEST_USER_ID`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` — used by the integration test job.

Admin cleanup endpoints
- `POST /api/admin/cleanup-idempotency` — deletes expired idempotency keys; requires header `x-admin-secret: <ADMIN_CRON_SECRET>`.
- `POST /api/admin/cleanup-rate-limits` — deletes `rate_limits` rows older than 7 days; requires header `x-admin-secret: <ADMIN_CRON_SECRET>`.

Run integration tests locally (scaffolded):

```bash
# Start the app locally (ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE keys are set in .env.local)
npm run dev

# In another shell, run the integration test (set BASE_URL and TEST_USER_EMAIL/PASSWORD)
BASE_URL=http://127.0.0.1:3000 TEST_USER_EMAIL=admin@gmail.com TEST_USER_PASSWORD=12345678 npx vitest run test/integration/auth-record.test.js --reporter verbose
```

