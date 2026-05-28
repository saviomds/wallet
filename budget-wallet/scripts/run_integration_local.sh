#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:3000}
EMAIL=${TEST_USER_EMAIL:-}
PASS=${TEST_USER_PASSWORD:-}

if [ -z "$EMAIL" ] || [ -z "$PASS" ]; then
  echo "Please set TEST_USER_EMAIL and TEST_USER_PASSWORD to run integration tests locally." >&2
  exit 1
fi

echo "Running integration test against $BASE_URL with $EMAIL"
BASE_URL="$BASE_URL" TEST_USER_EMAIL="$EMAIL" TEST_USER_PASSWORD="$PASS" npx vitest run test/integration/auth-record.test.js --reporter verbose
