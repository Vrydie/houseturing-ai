# Workflows de n8n (Frente B)

- Un archivo JSON por workflow, exportado desde la instancia del proyecto:
  `docker compose exec n8n n8n export:workflow --all --separate --output=/workflows`
- **Nombre:** `DS-XX_<nombre>.json`, igual que el inventario del ROADMAP.
- **Sin credenciales ni tokens:** n8n no exporta las credenciales, pero revisa que ningún nodo tenga un token escrito a mano. `/entregar` lo verifica.
- **Sin datos de prueba fijados** (pin data) con información de clientes reales.
- **Importar** en otra instancia: `n8n import:workflow --separate --input=/workflows` y luego asignar las credenciales en la interfaz.
- Solo el Frente B importa workflows al n8n del servidor.

## OT-05: generación reproducible y pruebas

Desde la raíz del checkout: `node workflows/generate_workflows.mjs`.
Los cuatro JSON se generan en `workflows/`, independientemente del directorio
actual. No editarlos a mano. Las credenciales exportadas contienen únicamente
referencias: `ot05-postgres` (Postgres dropship) y `ot05-ycloud` (Header Auth
`X-API-Key`, se configura en parte 3). La credencial real de YCloud no se creó.

Aplicar `db/migrations/001_ycloud.sql` antes de importar. Esta migración agrega
los campos YCloud y `normalizado JSONB` para conservar la ubicación de cualquier
mensaje de la ráfaga. `ycloud_ingresar` serializa por contacto y deduplica;
`ycloud_reclamar` adquiere el turno mediante un bloqueo de fila. El lease dura
60 s, se comprueba antes y después de cada espera y se libera al terminar.
Los mensajes se marcan procesados después de guardar la primera burbuja.
Si llega un mensaje nuevo o un eco humano, se cancelan las burbujas pendientes.
Un error de transporte deja vencer el lease; no reintenta envíos automáticamente.

DS-01 obtiene el secreto de `config.ycloud_webhook_secret` por autorización
expresa del dueño. Deshabilita la persistencia de datos de ejecución tanto en
éxito como en error y en ejecuciones manuales, porque la salida del nodo
Postgres contiene el secreto. No fijar datos de ese nodo ni exportar ejecuciones
completas. `tests/whatsapp/cargar_secreto.py --env <infra/.env principal>` carga
el valor sin imprimirlo. El acceso al entorno permanece bloqueado.

En n8n 2.15 los subflujos deben publicarse además de importarse. `publish:workflow`
actualiza la BD, pero un proceso n8n ya arrancado carga la activación tras
recrearse; esta acción queda a cargo del dueño. Los flujos de prueba `OT-05…`
se importan inactivos y solo se ejecutan por CLI, sin webhooks públicos.

Pruebas desde la raíz del worktree:

```bash
npm ci --prefix tests/whatsapp
node --test tests/whatsapp/unit.test.mjs
node tests/whatsapp/bd.test.mjs
node tests/whatsapp/cobertura_n8n.mjs
OT05_ENV_FILE=<ruta-al-env-principal> node tests/whatsapp/integracion.mjs
```

El mock de transporte escucha exclusivamente en `127.0.0.1:18085` dentro del
contenedor. `transporte_n8n.mjs` crea una copia de prueba de DS-03 que sustituye
las URLs por ese mock y omite Header Auth. No cambia los flujos de producción
ni `whatsapp_modo_simulado`. Verifica nodos HTTP, cuerpos, secuencia, tiempos y
filas SQL, pero no certifica credenciales ni entrega real de YCloud (parte 3).
Los datos sintéticos de prueba permanecen identificados en BD; no se borran.
