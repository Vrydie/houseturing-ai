#!/bin/bash
# tests/whatsapp/enviar.sh
FIXTURE=$1
BAD_SIGNATURE=$2

if [ -z "$FIXTURE" ]; then
  echo "Uso: ./enviar.sh <fixture.json> [--firma-mala]"
  exit 1
fi

PAYLOAD=$(cat "$FIXTURE")
SECRET="secret_local_test_12345"

if [ "$BAD_SIGNATURE" == "--firma-mala" ]; then
  SIGNATURE="sha256=firma_invalida_123"
else
  # Calculate HMAC SHA256 of the payload using the secret
  SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -r | awk '{print $1}')"
fi

echo "Enviando $FIXTURE a http://127.0.0.1:5690/webhook/whatsapp"
curl -s -X POST "http://127.0.0.1:5690/webhook/whatsapp" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$PAYLOAD"

echo -e "\nHecho."
