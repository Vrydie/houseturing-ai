# Evidencia OT-05 — Entrega para revisión

Todas las pruebas usan los contenedores `houseturing_n8n` y `houseturing_postgres`.
El modo simulado global permanece en `true`. No hubo llamadas a YCloud.

| Archivo | Comando / alcance | Resultado |
|---|---|---|
| `unitarios.txt` | `node --test tests/whatsapp/unit.test.mjs` | 7/7 pasan: C1–C4, C6–C8 |
| `transacciones-bd.json` | `node tests/whatsapp/bd.test.mjs` | SQL, filas y resultados C2/C3/C5/C6/eco |
| `schema-desde-cero.txt` | `db/schema.sql` dentro de esquema temporal transaccional, ROLLBACK | Pasa, sin alterar tablas existentes |
| `cobertura-n8n.json` | `node tests/whatsapp/cobertura_n8n.mjs` | Pasan los 4 casos (C10 resuelto) |
| `transporte-n8n.json` | `node tests/whatsapp/transporte_n8n.mjs` (21:34) | Corrida anterior de Codex |
| `transporte-n8n-texto.json` | `node tests/whatsapp/transporte_n8n.mjs` | Tres burbujas, HTTP typing/send, tiempos, estado accepted y filas |
| `transporte-n8n-plantilla.json` | `node tests/whatsapp/transporte_n8n.mjs plantilla` | Plantilla como objeto, estado y filas |
| `transporte-n8n-solo-leer.json` | `node tests/whatsapp/transporte_n8n.mjs solo-leer` | markAsRead, cero respuestas |
| `integracion-resumen.json` | `node tests/whatsapp/integracion.mjs` | Matriz HTTP completa; 9 pruebas. Todas pasan |
| `webhook-publico.json` | `node tests/whatsapp/publico.mjs <URL>` | Endpoint público vía túnel de Cloudflare (sin YCloud): PASS |

**Nota sobre `transporte-n8n-*.json`:**
La lista de llamadas (`calls`) en estos archivos es acumulada porque el servidor mock no se reinicia entre modos. Las llamadas propias de cada modo corresponden a aquellas cuyo payload de request tiene el id de su corrida. El archivo `transporte-n8n.json` con fecha antigua (21:34) pertenece a la corrida anterior de Codex.

El mock se ejecutó con `docker cp tests/whatsapp/mock_ycloud.mjs houseturing_n8n:/tmp/wf/`
y `docker exec -d houseturing_n8n node /tmp/wf/mock_ycloud.mjs`. Escucha solo en
loopback dentro del contenedor. 

Preparación ya ejecutada:

```bash
docker exec -i houseturing_postgres sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d dropship' < db/migrations/001_ycloud.sql
python3 tests/whatsapp/cargar_secreto.py --env ../../infra/.env
docker exec -i houseturing_postgres sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d dropship' < db/seeds/cobertura_prueba.sql
```

Pendientes: Parte 3 (Llamadas reales a YCloud, registro de webhook, configuración de número de empresa real y token real). Esta parte quedó fuera del alcance para la entrega según autorización expresa del dueño.
