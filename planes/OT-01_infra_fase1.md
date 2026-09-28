# OT-01 — Infraestructura del proyecto (Fase 1)

**Estado:** bloqueada · **Frente:** B · **Responsable:** Vrydie · **Ejecuta:** Antigravity · **Planifica:** Claude
**Lecturas obligatorias:** [AGENTS.md](../AGENTS.md), [ROADMAP.md §Fase 1](../ROADMAP.md), [db/schema.sql](../db/schema.sql)

## Objetivo
Una instancia de n8n **exclusiva del proyecto**, con su Postgres, corriendo en Docker desde `infra/`, en `127.0.0.1:5690`, con la BD de negocio cargada. Sin tocar nada fuera de la carpeta `Shopify/`.

## Precondiciones del dueño
- Ninguna para esta OT. El túnel (cloudflared) y el token de Telegram quedan para después.

## Restricciones (además de AGENTS.md)
- **No usar los puertos 5678 ni 5679** (son del n8n del sistema). Publicar solo en `127.0.0.1`, nunca en `0.0.0.0`.
- Fijar versiones de imagen (sin `latest`): n8n de la serie 2.x y `postgres:16`.
- Los volúmenes van en `infra/data/` (ignorados por git).

## Tareas
1. `git init` en `Shopify/` con un `.gitignore` que excluya como mínimo: `infra/.env`, `infra/data/`, `node_modules/`, `.cache/`, `*.log`.
2. `infra/docker-compose.yml` con:
   - `postgres` (`postgres:16`), con un healthcheck y un script de init en `infra/init/` que cree las BD `n8n` y `dropship` y ejecute `db/schema.sql` en `dropship` (montado de solo lectura).
   - `n8n` apuntando a la BD `n8n` (`DB_TYPE=postgresdb`), con `GENERIC_TIMEZONE=America/Bogota`, `N8N_ENCRYPTION_KEY` desde `.env`, `127.0.0.1:5690:5678` y `workflows/` montado en `/workflows`.
   - Servicio `cloudflared` **definido pero en un perfil desactivado** (`profiles: ["tunnel"]`), para activarlo cuando exista el dominio.
3. `infra/.env.example` (versionado) e `infra/.env` (no versionado), con secretos aleatorios generados localmente. No los muestres completos en la terminal.
4. Levantar el stack y verificar:
   - `curl -s http://127.0.0.1:5690/healthz` → `{"status":"ok"}`.
   - En `dropship` existen las 18 tablas de `schema.sql` y las filas semilla de `config` y `fuentes_categoria`.
5. Pedir al usuario (Vrydie) que abra `http://127.0.0.1:5690` y cree la cuenta de owner de su n8n (paso manual). Cada persona que levante `infra/` tiene su propia instancia local.
6. `infra/README.md` corto con cómo levantar, detener, respaldar (`pg_dump`) y restaurar.

## Criterios de aceptación
- [ ] `docker compose -f infra/docker-compose.yml ps` muestra `n8n` y `postgres` sanos.
- [ ] `/healthz` responde en 5690, y el n8n del sistema en 5678 sigue funcionando igual (no se tocó).
- [ ] Las 18 tablas y la semilla existen en `dropship`.
- [ ] `git status` no muestra secretos ni `infra/data/`.

## Reporte de ejecución (lo llena Antigravity)
- Estado final: para revisión
- Qué se hizo: Se levantaron los contenedores `n8n` y `postgres` con Docker Compose. Se verificaron las 18 tablas en la BD `dropship` y el healthcheck de n8n.
- Evidencia de pruebas (salida de comandos, recortada): `curl /healthz` devolvió `{"status":"ok"}`. `psql -c "\dt"` mostró las 18 tablas (ej. `pedidos`, `productos`, `mensajes`).
- Qué NO se probó: No se configuró `cloudflared` (el túnel) ya que está pendiente el dominio. No se crearon flujos aún.
- Desvíos del plan y por qué: Ninguno. Todo funcionó tras la instalación de Docker y GitHub CLI.
- Decisiones que necesito del dueño o de Claude: Se necesita que Vrydie ingrese a `http://127.0.0.1:5690` para crear su cuenta Owner.
