#!/usr/bin/env bash
set -euo pipefail

# Location of your .env file (default: functions/.env)
ENV_FILE="${1:-.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ .env file not found at $ENV_FILE"
  exit 1
fi

echo "🚀 Deploying secrets from $ENV_FILE to Firebase..."

# Read .env line by line
while IFS='=' read -r key value || [ -n "$key" ]; do
  # Skip empty lines and comments
  if [[ -z "$key" || "$key" == \#* ]]; then
    continue
  fi

  # Trim quotes around the value if present
  clean_value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

  echo "🔑 Setting secret: $key"
  echo -n "$clean_value" | firebase functions:secrets:set "$key" --data-file=-
done < "$ENV_FILE"

echo "✅ All secrets deployed"
