#!/usr/bin/env bash
set -euo pipefail

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required but was not found in PATH." >&2
  exit 1
fi

if [[ ! -f ".env" ]]; then
  echo ".env file not found. Copy .env.example to .env first." >&2
  exit 1
fi

set -a
. ./.env
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set in .env." >&2
  exit 1
fi

output_dir="${1:-./backups}"
mkdir -p "$output_dir"

timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
output_file="${output_dir}/saludario_${timestamp}.dump"

pg_dump "$DATABASE_URL" --format=custom --file="$output_file"

echo "Backup created at ${output_file}"
