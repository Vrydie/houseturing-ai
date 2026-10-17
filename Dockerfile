FROM n8nio/n8n:latest

USER root

# Copiar workflows, migraciones y scripts al contenedor
COPY workflows /workflows
COPY db /db
COPY infra /infra

# Instalar pg en /infra para sincronización directa con PostgreSQL de Railway
RUN cd /infra && npm init -y && npm install pg

# Script de entrada para auto-importar workflows, garantizar estado activo y arrancar n8n
RUN echo '#!/bin/sh' > /docker-entrypoint-railway.sh && \
    echo 'set -e' >> /docker-entrypoint-railway.sh && \
    echo 'echo "=== Iniciando HouseTuring n8n en Railway ==="' >> /docker-entrypoint-railway.sh && \
    echo 'if [ -n "$PORT" ]; then' >> /docker-entrypoint-railway.sh && \
    echo '  export N8N_PORT=$PORT' >> /docker-entrypoint-railway.sh && \
    echo 'fi' >> /docker-entrypoint-railway.sh && \
    echo 'if [ -f "/infra/railway_sync.mjs" ]; then' >> /docker-entrypoint-railway.sh && \
    echo '  echo "Sincronizando DB y asegurando estado activo en Railway..."' >> /docker-entrypoint-railway.sh && \
    echo '  node /infra/railway_sync.mjs || true' >> /docker-entrypoint-railway.sh && \
    echo 'fi' >> /docker-entrypoint-railway.sh && \
    echo 'exec /docker-entrypoint.sh' >> /docker-entrypoint-railway.sh && \
    chmod +x /docker-entrypoint-railway.sh

USER node

ENTRYPOINT ["/docker-entrypoint-railway.sh"]
