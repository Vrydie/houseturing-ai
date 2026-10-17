FROM n8nio/n8n:latest

USER root

# Copiar workflows, migraciones y scripts al contenedor
COPY workflows /workflows
COPY db /db
COPY infra /infra

# Instalar pg en /infra para sincronización directa con PostgreSQL de Railway
RUN cd /infra && npm init -y && npm install pg

# Script de entrada para auto-importar workflows y arrancar n8n en Railway
RUN echo '#!/bin/sh' > /docker-entrypoint-railway.sh && \
    echo 'set -e' >> /docker-entrypoint-railway.sh && \
    echo 'echo "=== Iniciando HouseTuring n8n en Railway ==="' >> /docker-entrypoint-railway.sh && \
    echo 'if [ -n "$PORT" ]; then' >> /docker-entrypoint-railway.sh && \
    echo '  export N8N_PORT=$PORT' >> /docker-entrypoint-railway.sh && \
    echo 'fi' >> /docker-entrypoint-railway.sh && \
    echo 'if [ -f "/infra/railway_sync.mjs" ]; then' >> /docker-entrypoint-railway.sh && \
    echo '  echo "Sincronizando flujos y DB en Railway..."' >> /docker-entrypoint-railway.sh && \
    echo '  node /infra/railway_sync.mjs || true' >> /docker-entrypoint-railway.sh && \
    echo 'fi' >> /docker-entrypoint-railway.sh && \
    echo 'if [ -d "/workflows" ] && [ "$(ls -A /workflows 2>/dev/null)" ]; then' >> /docker-entrypoint-railway.sh && \
    echo '  echo "Importando workflows actualizados via n8n CLI..."' >> /docker-entrypoint-railway.sh && \
    echo '  n8n import:workflow --separate --input=/workflows || true' >> /docker-entrypoint-railway.sh && \
    echo 'fi' >> /docker-entrypoint-railway.sh && \
    echo 'exec /docker-entrypoint.sh' >> /docker-entrypoint-railway.sh && \
    chmod +x /docker-entrypoint-railway.sh

USER node

ENTRYPOINT ["/docker-entrypoint-railway.sh"]
