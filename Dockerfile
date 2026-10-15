FROM docker.n8n.io/n8nio/n8n:2.15.0

USER root

# Copiar workflows exportados al contenedor
COPY workflows /workflows

# Script de entrada para auto-importar workflows y arrancar n8n en Railway
RUN echo '#!/bin/sh' > /docker-entrypoint-railway.sh && \
    echo 'set -e' >> /docker-entrypoint-railway.sh && \
    echo 'echo "=== Iniciando HouseTuring n8n en Railway ==="' >> /docker-entrypoint-railway.sh && \
    echo 'if [ -n "$PORT" ]; then' >> /docker-entrypoint-railway.sh && \
    echo '  export N8N_PORT=$PORT' >> /docker-entrypoint-railway.sh && \
    echo 'fi' >> /docker-entrypoint-railway.sh && \
    echo 'if [ -d "/workflows" ] && [ "$(ls -A /workflows 2>/dev/null)" ]; then' >> /docker-entrypoint-railway.sh && \
    echo '  echo "Importando workflows actualizados..."' >> /docker-entrypoint-railway.sh && \
    echo '  n8n import:workflow --separate /workflows || true' >> /docker-entrypoint-railway.sh && \
    echo 'fi' >> /docker-entrypoint-railway.sh && \
    echo 'exec /docker-entrypoint.sh' >> /docker-entrypoint-railway.sh && \
    chmod +x /docker-entrypoint-railway.sh

USER node

ENTRYPOINT ["/docker-entrypoint-railway.sh"]
