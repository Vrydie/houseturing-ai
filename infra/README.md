# Infraestructura Local

## Iniciar los servicios
`docker compose up -d`

## Detener los servicios
`docker compose down`

## Backups
`pg_dump -h 127.0.0.1 -p 5433 -U dropship dropship > backup.sql`

## OT-05: túnel rápido y pruebas desde un worktree

El perfil `tunnel-quick` usa `cloudflared-quick`; el perfil `tunnel` no cambia.
La URL `https://….trycloudflare.com` es efímera: un reinicio puede cambiarla.
El dueño actualiza `WEBHOOK_URL` y, en parte 3, la URL registrada en YCloud.
No registrar webhooks durante las pruebas simuladas.

El dueño aplica el Compose del worktree desde la raíz principal `Shopify/`:

```bash
docker compose --project-directory "$PWD/infra" --env-file "$PWD/infra/.env" -f "$PWD/.worktrees/ot-05/infra/docker-compose.yml" --profile tunnel-quick up -d --no-deps n8n cloudflared-quick
docker logs houseturing_tunnel_quick
```

`--project-directory` conserva los datos y montajes de la instancia principal.
El agente no ejecuta este comando. No se usa `down` ni se recrea Postgres.
Cuando se obtenga la URL, el dueño la guarda en `infra/.env` y repite el comando
anterior indicando solo `n8n` al final para cargar `WEBHOOK_URL`.

Solo se habilita `NODE_FUNCTION_ALLOW_BUILTIN=crypto`; el acceso al entorno de
los nodos conserva su valor por defecto. Por autorización expresa del dueño,
`config.ycloud_webhook_secret` contiene el secreto leído de `infra/.env` mediante
`tests/whatsapp/cargar_secreto.py`; no se imprime ni se incluye en exportaciones.
DS-01 no conserva datos de ejecución para evitar persistir la salida del nodo
que lee el secreto. No fijar datos ni ejecutar manualmente ese nodo en la UI.
La API key real queda en una credencial Header Auth `X-API-Key` para la parte 3.

Coexistencia: mientras el bot esté activo, la bandeja y la app se consultan sin
responder. Un eco de la app se guarda como `autor=humano`, pausa la conversación
y deja el motivo `humano_respondio_desde_app`. La reactivación es manual y queda
pendiente del puente D8; confirmar esta decisión al revisar OT-05.
