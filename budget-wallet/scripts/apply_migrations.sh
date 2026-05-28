#!/usr/bin/env bash
set -euo pipefail

if [ -z "${TEST_SUPABASE_DB_CONN:-}" ]; then
  echo "Please set TEST_SUPABASE_DB_CONN (postgres connection string)" >&2
  exit 1
fi

echo "Applying migrations from supabase/migrations"
for f in supabase/migrations/*.sql; do
  echo "Applying $f"
  psql "$TEST_SUPABASE_DB_CONN" -f "$f"
done

echo "Migrations applied"
