# OT-05 — Canal de WhatsApp por YCloud (reemplaza la parte 2 de OT-03)

**Estado:** lista · **Frente:** B · **Responsable:** Vrydie · **Ejecuta:** Antigravity · **Planifica:** Claude
**Prioridad:** va antes de OT-04. Con esto el bot queda conversando de verdad.
**Depende de:** OT-01 (n8n + Postgres) y OT-03 parte 1 (DS-01, DS-03, DS-T1 ya construidos y probados en simulado).

**Lecturas obligatorias:**
- [AGENTS.md](../AGENTS.md) y [COLABORACION.md](../COLABORACION.md).
- [ROADMAP.md](../ROADMAP.md): decisión **D1 revisada (28-sep-2026)**, Fase 2A y Fase 4.
- [OT-03](OT-03_entrada_whatsapp.md): lo ya construido y sus lecciones.
- Documentación de YCloud (enlaces exactos en cada paso).

## Por qué cambia el plan
La conexión directa con Meta quedó trancada en dos trámites del dueño: la verificación del negocio y el
armado de la app (usuario del sistema, token permanente, registro del webhook). YCloud es un **BSP oficial**:
por debajo es la misma Cloud API de Meta, así que **no se pierde nada de D1** (el objeto `referral.ctwa_clid`
llega igual, y con él la CAPI sigue funcionando), y además da una **bandeja de equipo** para ver en vivo lo
que responde el bot, que era justo lo que el dueño necesitaba.

**Lo que YCloud NO resuelve, y hay que decirlo claro:** los anuncios Click-to-WhatsApp y la CAPI siguen
necesitando el Business Manager del dueño con su cuenta publicitaria y su dataset. Esta OT desbloquea **el
bot**, no los anuncios. Por eso el requisito duro del paso 3: la WABA debe quedar en el BM del dueño.

## Qué cambia respecto a OT-03 (y qué no)
| Pieza | Antes (Meta directo) | Ahora (YCloud) |
|---|---|---|
| Entrada | Webhook de Meta, GET con `hub.challenge` + POST | POST del evento `whatsapp.inbound_message.received`. **No hay handshake GET** |
| Firma | `X-Hub-Signature-256` (HMAC con App Secret) | `YCloud-Signature: t=<unix>,s=<hmac>` → HMAC-SHA256 de `"<t>.<raw body>"` con el secreto `whsec_…` |
| Estados | `value.statuses` | evento `whatsapp.message.updated` |
| Envío | `POST graph.facebook.com/{PHONE_NUMBER_ID}/messages` + Bearer | `POST https://api.ycloud.com/v2/whatsapp/messages` + header `X-API-Key` |
| Leído / escribiendo | `typing_indicator` en el mismo POST | Dos llamadas sobre el id de YCloud del mensaje entrante (paso 6) |
| Plantillas | WhatsApp Manager | Se crean y se envían a aprobación desde YCloud |
| Lo que **no** cambia | Debounce, dedupe, bloqueo por conversación, ritmo humano, DS-T1, Postgres, CAPI directa a Meta | igual |

---

## Parte 0 — Lo que hace el dueño
**Hecho el 29-sep-2026 con coexistencia:** el número **+57 316 094 4561** sigue en la app WhatsApp Business del
celular y además quedó conectado a YCloud (Embedded Sign-up, WABA "House-Turing" en el portafolio "House-Turing"
del dueño). Estado en Meta: cuenta conectada, número conectado, cuenta activa.

**Falta del dueño:**
1. Prueba de ida y vuelta: mensaje desde un celular personal, respuesta desde la bandeja de YCloud, y ver que ambos
   aparecen también en la app del celular de la empresa.
2. Recargar saldo en YCloud (Billing).
3. `YCLOUD_API_KEY` (Developers → API Keys) a la bóveda.
4. Crear el webhook con la URL que entregue Antigravity (paso 1) y los eventos `whatsapp.inbound_message.received`,
   `whatsapp.message.updated` y **`whatsapp.smb.message.echoes`**. El `secret` (`whsec_…`) va a la bóveda.
5. `YCLOUD_WABA_ID` (panel de YCloud → WhatsApp → Accounts).
6. En paralelo: verificación del negocio en Security Center del BM (para anuncios y límites).

**Reglas de la coexistencia que debe cumplir el dueño:**
- Abrir la app WhatsApp Business del celular **al menos cada 14 días**; si no, Meta puede desconectar la API.
- **No activar Automations** en YCloud ni respuestas automáticas en la app (saludo, ausencia): el cliente recibiría
  dos respuestas.
- No borrar cuentas de WhatsApp en el BM sin consultar (el 29-sep se borraron dos y hubo que reconectar).

## Correcciones obligatorias heredadas de OT-03 (revisión de Claude, 29-sep-2026)
Revisé los flujos de `b/ot-03-correcciones` (commit `2042cd8`) nodo por nodo. Como DS-01 y DS-03 se rehacen aquí
para YCloud, **se corrigen en esta OT y no en OT-03**. Cada punto es un criterio de aceptación.

| # | Problema encontrado | Corrección exigida |
|---|---|---|
| C1 | **DS-03 no envía nada:** en modo real solo inserta en `mensajes`; no hay HTTP Request ni leído/escribiendo | HTTP Request a YCloud (paso 7), con `typingIndicator` antes de cada burbuja y el `estado` devuelto por la API guardado en `mensajes` |
| C2 | **Parámetros SQL separados por comas** (`queryReplacement: "{{a}},{{b}}"`): un texto con coma ("hola, quiero…") desplaza o rompe los campos | Pasa los parámetros como **arreglo** (`={{ [a, b, c] }}`, como ya hace DS-T1). Prueba obligatoria con un mensaje que tenga comas, comillas y saltos de línea |
| C3 | **Sin contactos ni conversaciones:** `conversacion_id` fijo en `1`; no se guarda `referral` (`ctwa_clid`, `ad_id`, headline) | Upsert de `contactos`, crear o reutilizar la conversación según `schema.sql` y guardar el origen del anuncio. Sin esto la CAPI queda ciega |
| C4 | **Secretos dentro de los nodos:** verify token `mi_token_secreto_123` y secreto `secret_local_test_12345` en nodos Code | Leerlos de Credenciales de n8n o de variables de entorno. Cero valores en los JSON exportados (AGENTS.md §3) |
| C5 | **Sin debounce de 8 s ni bloqueo** por conversación (`agente_ocupado_hasta`) | Implementarlos como pide OT-03 paso 3. Prueba: ráfaga de 3 mensajes → una sola respuesta |
| C6 | **Normalización incompleta:** audio, imagen, botón, interactivo y ubicación llegan como texto vacío; falta `origen` en el objeto normalizado | Cubrir todos los tipos del contrato [interno_mensaje_normalizado](../schemas/interno_mensaje_normalizado.schema.json) y validar la salida contra él |
| C7 | Firma comparada como string, sin `timingSafeEqual` | `crypto.timingSafeEqual` sobre buffers de igual longitud |
| C8 | Ritmo humano sin el componente aleatorio de 0,5-1,5 s | `min(7, max(1.5, 0.035 × caracteres + aleatorio(0.5, 1.5)))` |
| C9 | Sin evidencia en `planes/evidencia/OT-03/` pese a que el reporte decía "validado de punta a punta" | Evidencia por prueba en `planes/evidencia/OT-05/`: comando, salida y filas de la BD |

**Se conserva tal cual:** respuesta 200 inmediata, dedupe por `wamid`, no responder a estados y DS-T1 completo.

## Parte 1 — URL pública sin dominio propio
El dueño todavía no tiene dominio, y YCloud permite cambiar la URL del webhook con un clic, así que una URL
temporal sirve para esta etapa.

1. **Túnel rápido de Cloudflare** (sin cuenta ni token): añade a `infra/docker-compose.yml` un servicio en un
   perfil nuevo `tunnel-quick` con `cloudflare/cloudflared:latest` y `command: tunnel --url http://n8n:5678`.
   La URL `https://….trycloudflare.com` sale en los logs del contenedor. Documenta en `infra/README.md` que es
   **efímera**: si el contenedor se reinicia, cambia y hay que actualizarla en el panel de YCloud.
   No toques el perfil `tunnel` con token, que es el de producción.
2. Pon esa URL en `WEBHOOK_URL` de `infra/.env` y reinicia solo los servicios del proyecto.
3. Comprueba desde fuera que `https://…/webhook/whatsapp` responde, antes de dársela al dueño.

## Parte 2 — Adaptar los flujos (se puede hacer ya, sin cuenta de YCloud)
4. **Contratos en `schemas/`:** copia los ejemplos **literales** de la documentación de YCloud a
   `schemas/entrada_ycloud_mensaje.example.json` (uno con `referral`, de anuncio CTWA, y uno de texto normal),
   `schemas/entrada_ycloud_estado.example.json` y `schemas/salida_ycloud.example.json` (texto, plantilla,
   marcar leído, escribiendo). Fuentes:
   [inbound](https://docs.ycloud.com/reference/whatsapp-inbound-message-webhook-examples) ·
   [envío](https://docs.ycloud.com/reference/whatsapp-messaging-examples) ·
   [webhooks](https://docs.ycloud.com/reference/webhook-integration-guide).
   **No inventes campos:** si algo no está en la doc, anótalo como duda en el reporte.
   Deja los `entrada_whatsapp_*.example.json` de Meta donde están, como referencia histórica.
5. **Migración de BD** `db/migrations/001_ycloud.sql` (y el mismo cambio en `db/schema.sql`, en el mismo PR):
   - `mensajes.proveedor_id TEXT` — el `id` interno de YCloud del mensaje. **Hace falta:** marcar leído y
     "escribiendo…" se piden con ese id, no con el `wamid`.
   - `mensajes.waba_id TEXT` — `wabaId` del evento; la CAPI lo necesita como `whatsapp_business_account_id`.
   - `mensajes.autor TEXT CHECK (autor IN ('cliente', 'bot', 'humano'))` — con coexistencia hay dos emisores del lado
     de la empresa: el bot (API) y el dueño (app, llega como eco). La memoria del agente debe ver ambos.
   - Índice en `mensajes.proveedor_id`.
   - Claves nuevas en `config`: `whatsapp_proveedor = 'ycloud'` y `ycloud_numero_empresa = ''`.
     Conserva `whatsapp_modo_simulado`.
6. **DS-01 Entrada WhatsApp:**
   - Sigue respondiendo **200 de inmediato** (YCloud también reintenta).
   - **Firma:** con el nodo Crypto, HMAC-SHA256 de `"<t>.<raw body>"` usando `YCLOUD_WEBHOOK_SECRET`, donde `t`
     sale del header `YCloud-Signature`. Compara con `s`. **Descarta** si no coincide o si `t` tiene más de
     5 minutos. Verifica el algoritmo contra el ejemplo en Node de la doc antes de darlo por bueno.
   - Enruta por `type` del evento: `whatsapp.inbound_message.received` → flujo normal;
     `whatsapp.message.updated` → actualiza `mensajes.estado` y **termina** (lección 1 de OT-03: nunca responder a estados).
   - **Coexistencia — `whatsapp.smb.message.echoes`:** es un mensaje que el dueño escribió **desde la app del celular**
     ([ejemplos](https://docs.ycloud.com/reference/whatsapp-business-app-sent-message-sync-webhook-examples)).
     Guárdalo en `mensajes` con `direccion = 'out'` y `tipo` según el mensaje, **nunca lo pases al agente** (sería un
     bucle) y **pon `conversaciones.bot_activo = false`** con `motivo_escalamiento = 'humano_respondio_desde_app'`:
     si una persona entró a la conversación, el bot se calla para no responder encima. Se reactiva a mano (lo resuelve
     el puente de D8 en su OT). *Decisión a confirmar por el dueño en la revisión.*
   - Mapeo al contrato [interno_mensaje_normalizado](../schemas/interno_mensaje_normalizado.schema.json), que
     **no cambia**: `from` → `wa_id`; `wamid` → `wamids[]`; `id` → `proveedor_id`; `customerProfile.name` →
     `nombre_perfil`; `referral.ctwa_clid` / `referral.source_id` / `referral.headline` → `origen.ctwa_clid` /
     `ad_id` / `ad_headline`, con `origen.tipo = 'ctwa'` cuando llega `referral`; `sendTime` → `recibido_en`.
   - Dedupe igual, por `wamid` (`ON CONFLICT DO NOTHING`).
7. **DS-03 Enviar WhatsApp:** cambia solo el transporte.
   - `POST https://api.ycloud.com/v2/whatsapp/messages`, header `X-API-Key` (credencial Header Auth de n8n),
     cuerpo como **objeto** (lección 2 de OT-03), con `from` = número de la empresa y `to` = `wa_id`.
   - Ritmo humano, antes de cada burbuja, sobre el `proveedor_id` del último mensaje entrante:
     `POST /v2/whatsapp/inboundMessages/{id}/typingIndicator` (marca leído y muestra "escribiendo…"), y
     `POST /v2/whatsapp/inboundMessages/{id}/markAsRead` cuando no se vaya a responder. Se mantienen los
     tiempos de OT-03 (~35 ms por carácter, entre 1,5 y 7 s). El indicador se cae solo a los 25 s: no esperes más.
   - `whatsapp_modo_simulado = 'true'` sigue evitando la llamada real y guardando lo que habría enviado.
8. **Pruebas locales:** adapta `tests/whatsapp/enviar.sh` para firmar como YCloud (`t.body` con el secreto de
   prueba) y pasa los fixtures nuevos. Repite **las 11 pruebas de OT-03 parte 1** con los payloads de YCloud;
   todas deben seguir pasando. Añade tres: firma con `t` viejo (se descarta), evento `whatsapp.message.updated`
   (actualiza estado, cero respuestas) y evento `whatsapp.smb.message.echoes` (se guarda como `autor = 'humano'`,
   la conversación queda con `bot_activo = false` y el bot no responde).
9. **Exporta** DS-01 y DS-03 actualizados a `workflows/`, sin credenciales.

## Parte 3 — Conversación real
10. Carga las credenciales del dueño, `whatsapp_modo_simulado = 'false'` y `whatsapp_proveedor = 'ycloud'`.
11. Escribe "Hola" al número de la empresa desde el celular del dueño: llega la respuesta del stub, se ve la
    conversación en la **bandeja de YCloud** y los estados se registran en `mensajes`.
12. **La bandeja de YCloud y la app del celular son de solo lectura** mientras el bot esté activo (decisión del
    dueño, 28-sep-2026). Si el dueño igual responde desde el celular, el eco pausa el bot en esa conversación
    (paso 6). Prueba: escribe desde el celular de la empresa en una conversación abierta y verifica que el bot no
    vuelva a responder ahí. Anótalo en `infra/README.md`.
13. Deja corriendo 10 minutos de conversación de prueba: sin respuestas duplicadas y sin bucles.

## Criterios de aceptación
- [ ] Las 11 pruebas de OT-03 más las 3 nuevas pasan con payloads de YCloud, con evidencia en `planes/evidencia/OT-05/`.
- [ ] Firma verificada de verdad: un payload con firma mala y uno con `t` viejo no dejan nada en la BD.
- [ ] Un fixture de anuncio CTWA deja `ctwa_clid`, `ad_id` y `ad_headline` en `conversaciones`, y `waba_id` en `mensajes`.
- [ ] Conversación real: captura del chat en el celular **y** de la bandeja de YCloud, más las filas de `mensajes`.
- [ ] `workflows/` exportado y sin secretos; la migración y `db/schema.sql` en el mismo PR.
- [ ] C1 a C9 resueltas, cada una con su prueba.
- [ ] Nada tocado del n8n del sistema (:5678) ni del perfil `tunnel` de producción.

## Reporte de ejecución (lo llena Antigravity)
- Estado final:
- Qué se hizo:
- Evidencia:
- Qué NO se probó:
- Desvíos del plan y por qué:
- Decisiones que necesito del dueño:
