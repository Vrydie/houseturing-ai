# OT-03 — Entrada de WhatsApp, envío y cobertura

**Estado:** lista (empieza cuando OT-01 esté cerrada) · **Frente:** B · **Responsable:** Vrydie · **Ejecuta:** Antigravity · **Planifica:** Claude
**Lecturas obligatorias:**
- [AGENTS.md](../AGENTS.md) y [COLABORACION.md](../COLABORACION.md).
- [ROADMAP.md](../ROADMAP.md): Fase 4 (DS-01, DS-03, "Entrega con ritmo humano") y Fase 5 (DS-T1).
- Payloads de entrada: [entrada_whatsapp_mensaje](../schemas/entrada_whatsapp_mensaje.example.json) y [entrada_whatsapp_estado](../schemas/entrada_whatsapp_estado.example.json).
- Contratos: [interno_mensaje_normalizado](../schemas/interno_mensaje_normalizado.schema.json), [interno_herramientas_agente](../schemas/interno_herramientas_agente.schema.json) (`consultar_cobertura`) y [salida_whatsapp](../schemas/salida_whatsapp.example.json).
- [db/schema.sql](../db/schema.sql): tablas `contactos`, `conversaciones`, `mensajes`, `cobertura` y `config`.

## Objetivo
En la instancia n8n del proyecto (`127.0.0.1:5690`):
- **DS-01:** recibe mensajes de WhatsApp de forma segura y sin duplicados.
- **DS-03:** envía respuestas con ritmo humano.
- **DS-T1:** consulta la cobertura de envío.

Todo se prueba primero **sin Meta** (payloads de ejemplo y modo simulado) y después con el número de prueba de Meta. El agente de IA (DS-02) llega en OT-04: aquí hay un **stub** que responde un texto fijo.

## Precondiciones
- **Parte 1:** OT-01 cerrada (n8n y Postgres del proyecto funcionando). No necesita nada del dueño.
- **Parte 2 (del dueño):**
  - Dominio para el túnel y token de Cloudflare.
  - Rol de **Desarrollador** en la app de Meta, o que el dueño cambie la URL del webhook.
  - Token de WhatsApp (usuario del sistema) y App Secret, en la bóveda.

## Lecciones del flujo anterior (hecho a mano en otro n8n; no repetir)
1. **Bucle infinito de mensajes:** se respondía también a los webhooks de estado (`statuses`). Solo `value.messages` llega al agente.
2. **Comillas dobles en la respuesta:** `"body": "{{ JSON.stringify(x) }}"`. Los cuerpos se arman como **objeto** en una expresión, nunca interpolando strings.
3. **Memoria en RAM** (Window Buffer): se pierde al reiniciar. Aquí todo vive en Postgres.
4. **Sin deduplicación ni 200 inmediato:** Meta reintenta y el cliente recibe respuestas dobles.
5. **Notas de voz sin `text.body`:** rompían el flujo.
6. **Token temporal de 24 h:** en producción se usa el token del usuario del sistema.

## Restricciones
- Nada en el n8n del sistema (puerto 5678); ese flujo viejo **no se toca** (AGENTS.md §1).
- Secretos solo en Credenciales de n8n e `infra/.env`.
- Mensajes reales **solo a números de prueba verificados**.

---

## Parte 1 — Construir y probar sin Meta

1. **Credenciales en n8n:**
   - Postgres (BD `dropship`).
   - Header Auth "Meta WhatsApp" (en parte 1 puede llevar un valor falso).
   - Agrega a `config`: `whatsapp_modo_simulado = 'true'` y `whatsapp_app_secret_prueba` (un secreto de prueba local, no el real).
2. **Datos de prueba de cobertura:** crea `db/seeds/cobertura_prueba.sql` con unas 12 ciudades y cárgalo. Incluye:
   - Bogotá (`DC`), Medellín, Cali, Barranquilla, Bucaramanga y Pereira.
   - Un caso ambiguo, **dos "San José"** de departamentos distintos.
   - Una ciudad con `acepta_contraentrega = false`.
3. **DS-01 Entrada WhatsApp** (pasos 1 a 11 de la Fase 4 del ROADMAP), con estos detalles:
   - Webhook `whatsapp`, métodos GET y POST, *Raw Body* activado.
   - **GET:** responde `hub.challenge` si `hub.verify_token` coincide con `WA_WEBHOOK_VERIFY_TOKEN`.
   - **POST:**
     - Responde 200 de inmediato.
     - Verifica la firma `X-Hub-Signature-256` con el nodo Crypto (HMAC-SHA256 del *raw body*).
     - Si trae `statuses`, actualiza `mensajes.estado` y termina.
   - **Dedupe:** `INSERT … ON CONFLICT (wamid) DO NOTHING`.
   - **Contactos y conversaciones:** upsert de `contactos`; crear o reutilizar la conversación (regla del comentario en `schema.sql`); guardar `referral` (ctwa_clid, ad_id, headline).
   - **Normalización** a `interno_mensaje_normalizado`:
     - `text`, `button`, `interactive` y `location`: normales.
     - `audio`: texto `[nota de voz sin transcribir]`. La transcripción llega en OT-04.
     - `image`: `[imagen] <caption>`.
   - **Debounce de 8 s** (valor en `config`) y **bloqueo por conversación** (`agente_ocupado_hasta`).
   - **Salida:** llama al **stub DS-02**, un workflow `DS-02 Agente (stub)` que devuelve "Hola, recibimos tu mensaje: <texto>". Se reemplaza en OT-04.
4. **DS-03 Enviar WhatsApp** (sub-workflow):
   - **Entrada:** `{ wa_id, texto | plantilla, responder_a_wamid? }`.
   - Parte el texto por párrafos (máx. 3 burbujas).
   - Antes de cada burbuja: marcar leído + `typing_indicator` y esperar ~35 ms por carácter + 0,5-1,5 s aleatorios (entre 1,5 y 7 s).
   - Cuerpo del request como **objeto** según `salida_whatsapp.example.json`.
   - Guarda cada mensaje saliente en `mensajes` (`direccion = 'out'`).
   - Si `whatsapp_modo_simulado = 'true'`: **no llama a Meta**; guarda lo que habría enviado.
5. **DS-T1 consultar_cobertura** (sub-workflow):
   - **Entrada:** `{ ciudad, departamento? }`.
   - Normaliza el texto (minúsculas, sin tildes) y busca en `cobertura`.
   - **Salida:** exactamente `consultar_cobertura_salida` (con `opciones` si la ciudad es ambigua).
6. **Script de pruebas** `tests/whatsapp/enviar.sh <fixture.json> [--firma-mala]`:
   - Hace POST al webhook de prueba con la firma HMAC calculada con el secreto de prueba.
   - Fixtures en `tests/whatsapp/fixtures/`, derivados de los de `schemas/`: texto con referral, estado, audio, botón y ráfaga de 3.
7. **Exporta** DS-01, DS-02 (stub), DS-03 y DS-T1 a `workflows/`, sin credenciales (ver `workflows/README.md`).

### Pruebas de la parte 1 (resultado esperado)
| Caso | Esperado |
|---|---|
| Texto con `referral` | 1 contacto, 1 conversación con `ctwa_clid` y `ad_id`, 1 mensaje `in`, 1 respuesta simulada `out` |
| El mismo payload 2 veces | Segunda vez: nada nuevo (dedupe) |
| Payload de `statuses` | Actualiza el estado; **ninguna** respuesta |
| Ráfaga de 3 mensajes en 3 s | **Una** sola respuesta con los 3 textos concatenados |
| Firma inválida | Descartado; nada en la BD |
| Audio | Texto `[nota de voz sin transcribir]`; el flujo no se rompe |
| GET con verify token correcto e incorrecto | Devuelve `hub.challenge` / 403 |
| Cobertura "bogota" | `cubierto: true`, `ciudad_oficial: "Bogotá"` |
| Cobertura "San José" | `opciones` con 2 ciudades |
| Ciudad fuera de la lista | `cubierto: false` |
| Ciudad sin contraentrega | `cubierto: true`, `acepta_contraentrega: false` |

## Parte 2 — Conectar el número de prueba de Meta
8. Activa el túnel (perfil `tunnel` de `infra/docker-compose.yml`) y define `WEBHOOK_URL`.
9. En la app de Meta, con tu rol de desarrollador o pidiéndoselo al dueño: callback = URL pública de DS-01 y suscripción al campo `messages`. Si la cuenta de WhatsApp Business es nueva, suscribe la app (`POST /{WABA_ID}/subscribed_apps`).
10. `whatsapp_modo_simulado = 'false'`. Escribe "Hola" desde un número de prueba verificado: llega la respuesta del stub, se registran los estados y no hay bucle.
11. **Avisa al dueño** para que apague el flujo viejo del n8n del sistema. Eso lo hace él; tú no lo tocas.

## Criterios de aceptación
- [ ] Las 11 pruebas de la parte 1 pasan, con evidencia en `planes/evidencia/OT-03/`.
- [ ] Los workflows están exportados en `workflows/` y no contienen credenciales ni tokens (`/entregar` lo verifica).
- [ ] La parte 2 muestra una conversación real con el número de prueba: captura del chat y filas en `mensajes`.
- [ ] En 10 minutos de conversación de prueba no hay respuestas duplicadas ni en bucle.

## Reporte de ejecución (lo llena Antigravity)
- Estado final:
- Qué se hizo:
- Evidencia:
- Qué NO se probó:
- Desvíos del plan y por qué:
- Decisiones que necesito del dueño:
