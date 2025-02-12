#!/usr/bin/env bash
set -e

# ENV Variablen
DOMAIN="$DOMAIN_NAME"
ACME_EMAIL="$ACME_EMAIL"

ACME_HOME="/opt/acme.sh"
ACME_BIN="$ACME_HOME/acme.sh"
ACME_DATA="/acme-data"   # bind mount
CERT_KEY="$ACME_DATA/$DOMAIN.key"
CERT_FULLCHAIN="$ACME_DATA/$DOMAIN.cer"

echo "==> Checking if we have certs in $ACME_DATA ..."

if [ ! -f "$CERT_KEY" ] || [ ! -f "$CERT_FULLCHAIN" ]; then
  echo "==> No existing cert found. Trying to issue new certificate via acme.sh..."

  # Stop anything listening on 80
  fuser -k 80/tcp || true

  # Issue cert (standalone mode => uses :80)
  $ACME_BIN --issue \
    --standalone \
    -d "$DOMAIN" \
    --accountemail "$ACME_EMAIL" \
    --keylength 4096 \
    --force \
    --key-file       "$CERT_KEY" \
    --fullchain-file "$CERT_FULLCHAIN"

  echo "==> Certificate obtained at $CERT_FULLCHAIN"
else
  echo "==> Found existing cert. Attempting renew..."
  # If we have a certificate, let's try renew
  fuser -k 80/tcp || true

  $ACME_BIN --renew --standalone -d "$DOMAIN" \
    --key-file       "$CERT_KEY" \
    --fullchain-file "$CERT_FULLCHAIN" \
    --force
fi

echo "==> Starting Node app with TLS..."

# Node app expects /acme-data/<domain>.key and .cer
# We'll pass them as ARGS to server.js or read from ENV

exec node server.js
