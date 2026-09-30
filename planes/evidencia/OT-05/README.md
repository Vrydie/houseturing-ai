# Evidencia OT-05 — avance, no entrega final

Todas las pruebas usan los contenedores `houseturing_n8n` y `houseturing_postgres`.
El modo simulado global permanece en `true`. No hubo llamadas a YCloud.

| Archivo | Comando / alcance | Resultado |
|---|---|---|
| `unitarios.txt` | `node --test tests/whatsapp/unit.test.mjs` | 7/7 pasan: C1–C4, C6–C8 |
| `transacciones-bd.json` | `node tests/whatsapp/bd.test.mjs` | SQL, filas y resultados C2/C3/C5/C6/eco |
| `schema-desde-cero.txt` | `db/schema.sql` dentro de esquema temporal transaccional, ROLLBACK | Pasa, sin alterar tablas existentes |
| `C10-antes.json` | `node tests/whatsapp/cobertura_n8n.mjs` antes de C10 | Falta ciudad inexistente: 3 resultados de 4 |
| `C10-despues.json` | Mismo comando tras C10 | Pasan los 4 casos |
| `transporte-n8n.json` | `node tests/whatsapp/transporte_n8n.mjs` | Tres burbujas, HTTP typing/send, tiempos, estado accepted y filas |
| `transporte-n8n-plantilla.json` | `node tests/whatsapp/transporte_n8n.mjs plantilla` | Plantilla como objeto, estado y filas |
| `transporte-n8n-solo-leer.json` | `node tests/whatsapp/transporte_n8n.mjs solo-leer` | markAsRead, cero respuestas |
| `publicacion-local.txt` | `docker exec … n8n publish:workflow --id=…` | Publicados en BD; el dueño debe recrear n8n |
| `revision-secretos.json` | Comparación con valores secretos del `.env` principal, sin mostrarlos | Sin coincidencias en archivos cambiados |

El mock se ejecutó con `docker cp tests/whatsapp/mock_ycloud.mjs houseturing_n8n:/tmp/wf/`
y `docker exec houseturing_n8n node /tmp/wf/mock_ycloud.mjs`. Escucha solo en
loopback dentro del contenedor. La copia de prueba reemplaza las URLs YCloud por
`http://127.0.0.1:18085` y omite Header Auth: no certifica autenticación real.
Los comandos, cuerpos sintéticos, tiempos y filas están en los JSON indicados.

Preparación ya ejecutada:

```bash
docker exec -i houseturing_postgres sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d dropship' < db/migrations/001_ycloud.sql
python3 tests/whatsapp/cargar_secreto.py --env ../../infra/.env
docker exec -i houseturing_postgres sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d dropship' < db/seeds/cobertura_prueba.sql
```

La migración agregó cuatro columnas, un índice, cuatro claves de configuración
y dos funciones; finalizó con COMMIT. La semilla insertó 12 ciudades. La credencial
Postgres se importó por stdin, sin archivos de secretos. Los JSON se generaron con
`node workflows/generate_workflows.mjs`, se copiaron a `/tmp/wf/` y se importaron
con `n8n import:workflow --separate --input=/tmp/wf`.

Pendientes: matriz de integración HTTP (`tests/whatsapp/integracion.mjs`), crypto
cargado en el contenedor, prueba de URL pública y `WEBHOOK_URL`. No se confunden
las pruebas unitarias/SQL/mock con pruebas completas del webhook.
