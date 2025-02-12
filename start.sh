#!/usr/bin/env bash
set -e

ACME_DATA=/acme-data
DOMAIN="${DOMAIN_NAME:-example.com}"
ACME_EMAIL="${ACME_EMAIL:-you@example.com}"

CERT_KEY="$ACME_DATA/$DOMAIN.key"
CERT_FULLCHAIN="$ACME_DATA/$DOMAIN.cer"

# anstatt /opt/acme.sh/acme.sh => einfach "acme.sh"
ACME_BIN="acme.sh"

echo "==> Checking if we have cert at $CERT_KEY and $CERT_FULLCHAIN"
if [ ! -f "$CERT_KEY" ] || [ ! -f "$CERT_FULLCHAIN" ]; then
  echo "==> No existing cert. Issuing new..."
  fuser -k 80/tcp || true

  # Standalone-Mode => acme.sh lauscht selbst auf :80
  $ACME_BIN --issue \
    --standalone \
    -d "$DOMAIN" \
    --accountemail "$ACME_EMAIL" \
    --keylength 4096 \
    --force \
    --key-file       "$CERT_KEY" \
    --fullchain-file "$CERT_FULLCHAIN"
else
  echo "==> Attempting to renew..."
  fuser -k 80/tcp || true

  $ACME_BIN --renew \
    --standalone \
    -d "$DOMAIN" \
    --key-file       "$CERT_KEY" \
    --fullchain-file "$CERT_FULLCHAIN" \
    --force
fi

echo "==> Starting Node HTTPS app..."

exec node server.js
