#!/usr/bin/env bash
set -euo pipefail

# Simple helper to apply Supabase migrations and deploy edge functions.
# Usage: `bash ./scripts/deploy_supabase.sh` (requires `supabase` CLI in PATH)

# Load .env if present
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs || true)
fi

if [ -z "${VITE_SUPABASE_URL:-}" ]; then
  echo "VITE_SUPABASE_URL not set. Copy .env.example to .env and set VITE_SUPABASE_URL." >&2
  exit 1
fi

PROJECT_REF=$(echo "$VITE_SUPABASE_URL" | sed -E 's#https?://([^\.]+)\..*#\1#')
echo "Using Supabase project ref: $PROJECT_REF"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install from https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

echo "Applying migrations..."
if supabase migrations apply --project-ref "$PROJECT_REF"; then
  echo "Migrations applied via supabase migrations apply"
else
  echo "Failed or unsupported: trying supabase db push as fallback"
  supabase db push --project-ref "$PROJECT_REF"
fi

echo "Deploying functions..."
for fn in supabase/functions/*; do
  if [ -d "$fn" ]; then
    name=$(basename "$fn")
    echo "Deploying function $name"
    supabase functions deploy "$name" --project-ref "$PROJECT_REF"
  fi
done

echo "Done."
