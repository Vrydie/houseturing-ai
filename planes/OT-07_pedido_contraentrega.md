# OT-07 — Crear pedidos contraentrega de verdad (DS-T2 + DS-05)

**Estado:** **reabierta** (correcciones C1-C5 de la revisión de Claude, 5-oct-2026; ver más abajo) · **Frente:** B · **Responsable:** Vrydie · **Ejecuta:** Antigravity · **Planifica:** Claude
**Prioridad:** alta. Con esto el agente puede cerrar una venta real. Es la Fase 5 del ROADMAP para contraentrega.
**Depende de:** PR #9 (OT-06) unido a `main`, que trae el formato de pedido validado con Dropi. OT-04 (DS-02 y DS-T1).

**Lecturas obligatorias:**
- [AGENTS.md](../AGENTS.md), sobre todo §3 (secretos), §4 (acciones con efectos reales) y §4 bis (simular antes de ejecutar; entra con el PR #8).
- [ROADMAP.md](../ROADMAP.md): D5, D6 y Fase 5 (DS-T2, pasos 1 a 6).
- [schemas/salida_shopify_pedido.graphql](../schemas/salida_shopify_pedido.graphql): bloque 1, **VALIDADO CON DROPI**.
- [schemas/interno_herramientas_agente.schema.json](../schemas/interno_herramientas_agente.schema.json): entrada y salida de `crear_pedido_contraentrega`.
- [OT-06](OT-06_prueba_shopify_dropi.md) y [su evidencia](evidencia/OT-06/README.md): qué funcionó, qué no y por qué.
- [tienda/scripts/prueba_pedido_dropi.mjs](../tienda/scripts/prueba_pedido_dropi.mjs): el payload exacto que llegó bien a Dropi. Úsalo como referencia, no lo modifiques (es del Frente A).

---

## Por qué
El DS-T2 que hay en `main` no puede crear un pedido real:
- No manda producto (`lineItems`), ni `countryCode`, ni `provinceCode`, ni `transactions`, así que Dropi no sabría qué despachar ni cuánto cobrar.
- Lee el precio de `ofertas`, pero no lo usa.
- No exige `confirmado_por_cliente`, no vuelve a comprobar la cobertura, no evita pedidos duplicados y no guarda el pedido en `pedidos`.
- El token de Shopify está escrito como `AQUÍ_VA_TU_TOKEN`, y el nodo se llama "(Mock)".

Además, el reporte de OT-04 menciona `tests/shopify/tools_test.mjs`, pero ese archivo no está en el repositorio. **Las pruebas de esta OT tienen que quedar versionadas.**

## Formato validado (no cambiar sin una nueva prueba con Dropi)
- `lineItems`: `variantId` de `productos.shopify_variant_gid`, `quantity` = `ofertas.cantidad` y `priceSet` = precio unitario (`precio_total / cantidad`). Si la división no es exacta, se detiene con error.
- `shippingAddress` y `billingAddress`: `firstName`, `lastName`, `address1` = dirección (+ complemento), `address2` = barrio, `city` = `ciudad_oficial`, `provinceCode` = `cobertura.shopify_province_code`, `countryCode: "CO"` y `phone: "+57" + celular`.
- `phone: "+57" + celular`.
- `transactions`: `kind: SALE`, `status: PENDING`, `gateway: "Pago contra entrega"` y monto = `ofertas.precio_total`.
- `tags`: `canal:whatsapp` y `wa:<wa_id>`; más `TEST` cuando `config.modo_pedidos = 'prueba'`.
- `customAttributes`: `wa_id` y `conversacion_id`.
- `options: { sendReceipt: false, sendFulfillmentReceipt: false }`.
- **Sin `customer`**: Shopify rechaza el pedido entero si `customer.toUpsert` no lleva email.
- `wa_id` y `conversacion_id` salen del contexto de la ejecución, **nunca del LLM**.

## Pasos

### Parte 1 — Datos y token (sin efectos externos)
1. **Migración `db/migrations/002_pedidos.sql`**, actualizando `db/schema.sql` en el mismo PR:
   - En `config`: `modo_pedidos` (`'simulado' | 'prueba' | 'real'`, por defecto **`'simulado'`**), `shopify_token_expira_en` y `shopify_gateway_contraentrega` (`'Pago contra entrega'`).
   - (`pedidos` ya tiene `es_prueba`, `creado_en` y el índice `pedidos_wa_idx`: no hace falta otro para la idempotencia.)
2. **Semilla `db/seeds/producto_ejemplo.sql`** (producto de EJEMPLO, solo para pruebas):
   - `productos`: `CM-135`, `shopify_variant_gid = gid://shopify/ProductVariant/48848562651254`.
   - `ofertas`: `x1` = 1 unidad, $219.900; `x2` = 2 unidades, $399.900 (de la ficha, §5).
   - `cobertura`: que Cali exista con `shopify_province_code = 'VAC'`. Para el resto, documenta qué falta: el listado completo llega con la API de Dropi.
3. **DS-05 Renovar token Shopify** (Schedule cada 20 h): *client credentials* con las credenciales de n8n, guarda `shopify_access_token` y `shopify_token_expira_en` en `config`. Si falla, alerta a DS-00. Nunca imprimir el token.

### Parte 2 — DS-T2 completo
4. Reescribe DS-T2 siguiendo la Fase 5 del ROADMAP, en este orden:
   1. **Validar la entrada** contra el esquema `crear_pedido_contraentrega`: celular `^3[0-9]{9}$`, dirección y barrio no vacíos, `confirmado_por_cliente === true`. Si algo falla: `{ok:false, error:"<motivo legible>"}` y no se crea nada.
   2. **Volver a llamar a DS-T1** con la ciudad: sin cobertura o sin contraentrega → `{ok:false}`. Usa `ciudad_oficial` y `shopify_province_code` de la respuesta, no lo que mandó el LLM.
   3. **Producto disponible:** si `productos.disponible = false` → `{ok:false, error:"sin stock"}`.
   4. **Idempotencia:** si el mismo `wa_id` tiene un pedido `creado` con la misma oferta en las últimas 2 h, devuelve ese pedido sin crear otro.
   5. **Precio solo desde `ofertas`** con el `oferta_id`. Cualquier monto que mande el LLM se ignora.
   6. **Armar el payload** con el formato validado (arriba), en un nodo Code con funciones puras, para que se puedan probar sin red.
   7. **Según `config.modo_pedidos`:**
      - `simulado`: **no llama a Shopify.** Guarda en `pedidos` con `es_prueba = true`, `shopify_order_name = 'SIM-<id>'`, y devuelve un número simulado.
      - `prueba`: llama a `orderCreate` con el tag `TEST`.
      - `real`: llama a `orderCreate` sin `TEST`. **Este modo solo lo activa el dueño.**
   8. Revisa los `userErrors`. Si hay alguno: `{ok:false}`, alerta a DS-00 y no guarda nada en `pedidos`.
   9. **Guarda en `pedidos`** (`modalidad 'contraentrega'`, total, `datos_envio`, `shopify_order_gid` y `name`, `es_prueba`) y devuelve `{ok:true, numero_pedido, total, moneda, dias_entrega}`.
5. El token se lee de `config.shopify_access_token`, nunca escrito en el nodo. Quita "(Mock)" del nombre del nodo.

### Parte 3 — Pruebas (sin efectos externos)
6. **`tests/pedidos/unit.test.mjs` con `node --test`**, sin red, sobre las funciones puras del paso 4.6:
   - El payload de `x1` es igual al de OT-06 (mismos campos y formato; datos de ejemplo).
   - `x2` → `quantity: 2`, precio unitario 199950 y transacción 399900.
   - Un `precio` o `total` enviado por el LLM se ignora.
   - Celular inválido, sin barrio, `confirmado_por_cliente: false` o ciudad sin cobertura → `ok:false` sin payload.
   - Ningún payload trae `customer`.
   - En modo `prueba` va el tag `TEST`; en `real`, no.
7. **Integración en n8n con `modo_pedidos = 'simulado'`:** una conversación por DS-01 → DS-02 que termine en un pedido simulado guardado en `pedidos`. Repetirla en menos de 2 h devuelve el mismo pedido (idempotencia). Evidencia en `planes/evidencia/OT-07/`.

### Parte 4 — Un pedido de prueba real (gate del dueño)
8. **Solo con el OK escrito del dueño y con él mirando el panel de Dropi** (igual que en OT-06): `modo_pedidos = 'prueba'`, una conversación de prueba desde el número del dueño que termine en **un** pedido. Debe llegar a Dropi con los 6 campos de OT-06 correctos.
9. **El dueño lo cancela primero en Dropi**, luego se cancela en Shopify con `tienda/scripts/cancelar_pedido_prueba.mjs` (simulación → OK → `--aplicar`). Vuelve a dejar `modo_pedidos = 'simulado'`.

## Fuera de esta OT (bloqueado o para después)
- **Confirmar el pedido en Dropi automáticamente** (sale de PENDIENTE CONFIRMACION): bloqueado hasta que Dropi entregue el acceso a la API. El dueño ya lo pidió por correo el 2-oct-2026. Va en otra OT.
- DS-T3 (link de pago): sigue simulado. El negocio arranca solo con contraentrega.
- Stock desde la API de Dropi (D7): otra OT.

## Reglas
- `modo_pedidos` arranca en `'simulado'` y se devuelve a `'simulado'` al terminar cada prueba.
- Nunca se crea un pedido sin tag `TEST` en esta OT.
- Datos personales del dueño solo en `infra/.env` o en la BD local; la evidencia va enmascarada.
- Archivos de texto en UTF-8 (AGENTS.md §10). Exporta los workflows a `workflows/` y actualiza `generate_workflows.mjs` si lo usas.

## Criterios de aceptación
- [ ] Migración 002 + `schema.sql` actualizados; semilla del producto de ejemplo.
- [ ] DS-05 renueva el token y lo guarda en `config` (probado una vez, sin imprimir el token).
- [ ] DS-T2 cumple los pasos 4.1 a 4.9; sin token escrito en el workflow.
- [ ] `node --test tests/pedidos` pasa y está versionado; salida pegada en el reporte.
- [ ] Integración en modo `simulado` con idempotencia demostrada.
- [ ] Un pedido TEST real llegó a Dropi con los 6 campos correctos y quedó cancelado en Dropi y en Shopify (con el OK del dueño).

## Correcciones de la revisión de Claude (5-oct-2026)

**Por qué se reabre.** El PR #13 se unió a `main` antes de la revisión. Lo que está bien: las 6 pruebas `node --test` pasan, `modo_pedidos` arranca en `simulado`, el precio sale de `ofertas`, el token sale de `config`, hay idempotencia de 2 h y no hay secretos en el repositorio (barrido hecho el 5-oct). Pero la revisión contra el esquema real de Shopify y contra `infra/docker-compose.yml` encontró defectos que las pruebas actuales no pueden ver: solo comparan `armarPayload` consigo mismo, y el modo `simulado` nunca llama a Shopify. **Ninguno crea un pedido por error:** todos harían fallar la primera prueba real (parte 4). Se corrigen antes de esa prueba.

- [ ] **C1. `options` está en el lugar equivocado** (verificado el 5-oct-2026 contra la API `2026-07`). `OrderCreateOrderInput` no tiene un campo `options`; `orderCreate` lo recibe como argumento aparte (`OrderCreateOptionsInput`: `inventoryBehaviour`, `sendReceipt`, `sendFulfillmentReceipt`). `workflows/dst2_logic.js:78` (y `workflows/generate_dst2.mjs:80`, que genera el nodo "Construir Payload") lo meten **dentro de `order`**, y la mutación de `dst2_logic.js:32` solo declara `$order`. Shopify rechazará la variable (campo no definido en el tipo) y no creará el pedido. Corrección: declarar `$options: OrderCreateOptionsInput`, llamar `orderCreate(order: $order, options: $options)` y enviar `variables: { order, options }`, igual que en `tienda/scripts/prueba_pedido_dropi.mjs` y en `schemas/salida_shopify_pedido.graphql`. Regenerar y volver a exportar el workflow.
- [ ] **C2. Variables de entorno que n8n no ve.** Cuatro workflows leen `$env[...]`: DS-05 (`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`), DS-T2 (`SHOPIFY_STORE_DOMAIN`), DS-10 (`SHOPIFY_API_SECRET`) y DS-11 (`TELEGRAM_CHAT_ID`). Pero:
  1. `infra/docker-compose.yml` solo pasa `TELEGRAM_CHAT_ID` al contenedor de n8n; ninguna de las de Shopify.
  2. n8n 2.x bloquea por defecto el acceso a variables de entorno desde los nodos (`N8N_BLOCK_ENV_ACCESS_IN_NODE=true`, [lista de cambios de n8n 2.0](https://docs.n8n.io/2-0-breaking-changes/)), y `infra/README.md` dice que se dejó el valor por defecto.
  3. Los nombres no coinciden con `.env.example`: DS-10 usa `SHOPIFY_API_SECRET` (allí es `SHOPIFY_CLIENT_SECRET`) y el compose usa `TELEGRAM_CHAT_ID` (allí es `TELEGRAM_CHAT_ID_OPERADOR`).

  Consecuencia: DS-05 no puede renovar el token, DS-T2 arma la URL de Shopify sin dominio y DS-10 no puede verificar la firma de los webhooks. El reporte atribuye el bloqueo a que "faltan las claves de Shopify en el `.env`"; en el `.env` del dueño ya están (comprobado el 1-oct), así que aunque se copien a otro equipo el flujo seguiría fallando. Corrección, a elegir y dejar documentada:
  - **(a) Recomendada:** lo que no es secreto (dominio de la tienda, `TELEGRAM_CHAT_ID`) va a la tabla `config`, como `modo_pedidos` y el token; los secretos (`client_id`/`client_secret` de Shopify y el secreto de los webhooks) van en una **credencial de n8n** (AGENTS.md §3).
  - **(b)** pasar las variables en el compose y poner `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`. Es más simple, pero deja todas las variables del contenedor legibles desde cualquier nodo Code; si se elige, pasar solo las imprescindibles.
  - Unificar los nombres con `.env.example` y comprobar en n8n 2.15.0 que cada workflow lee su valor.
- [ ] **C3. Una prueba que sí atrape C1.** Añadir a `tests/pedidos/` un test que compare las claves de `variables.order` con los campos reales de `OrderCreateOrderInput` (lista guardada en `tests/pedidos/fixtures/`, generada por una consulta de introspección de solo lectura y anotando la versión de la API y la fecha) y compruebe que `variables` solo trae `order` y `options`. Así, un cambio de formato falla en `node --test` y no con un pedido real.
- [ ] **C4. Menores.** (a) `gateway: "Pago contra entrega"` está escrito a mano en `dst2_logic.js:69`, pero "DB Fetch" ya lee `config.shopify_gateway_contraentrega`: usarla. (b) `workflows/DS-02_stub.json` contiene el agente completo ("DS-02 Agente de Ventas", 15 nodos): renombrarlo a `DS-02_Agente_Ventas.json`, que es como lo llama OT-09.
- [ ] **C5. El agente de IA exportado no coincide con lo que dicen OT-04 y OT-09.**
  - Usa el modelo **`deepseek-chat`** (`https://api.deepseek.com/v1`, credencial "OpenAI account 2"), no Gemini.
  - Su mensaje de sistema es una sola línea ("Eres un asesor de ventas de una tienda virtual."): no carga `prompts/agente_ventas_system.md` ni la ficha del producto, que según su propio encabezado es la única fuente de verdad del agente.

  Confirmar si existe una versión más completa que no se exportó. Si no, exportarla o construirla antes de que el agente hable con clientes. **El proveedor de IA lo decide el dueño** (siguiente apartado).

**Decisiones del dueño (no las toma Antigravity):**
1. **Proveedor del modelo de IA.** Cada conversación envía a ese proveedor el nombre, el celular, la dirección y el barrio del cliente. DeepSeek es de una empresa china, y en el nivel gratis de Gemini Google puede usar y revisar lo que se envía. En ambos casos hay que consultar con un abogado si basta con informarlo en la política de tratamiento de datos o si se necesita autorización por la transferencia internacional de datos (Ley 1581 de 2012, art. 26). Mientras tanto, solo conversaciones de prueba con datos falsos.
2. **Política de tratamiento de datos.** Hoy dice que los datos se usan "exclusivamente" para procesar el pedido. Si un asistente automático los procesa, hay que decirlo.

**Criterios de aceptación de esta ronda:** C1 a C4 hechos y `node --test` pasando, incluido el test de C3. En n8n, DS-05 guarda un token en `config` (sin imprimirlo) y una ejecución en modo `simulado` sigue guardando el pedido simulado. La parte 4 (pedido `TEST` real con el dueño mirando Dropi) solo se hace después de esto y con el OK del dueño.

## Reporte de ejecución (lo llena Antigravity)
- **Estado final:** Para revisión (Bloqueada en integración final)
- **Qué se hizo:** 
  - Se aplicaron las migraciones y la semilla de BD (`002_pedidos.sql` y `producto_ejemplo.sql`).
  - Se generó y exportó el workflow DS-T2 con todas las validaciones puras y lógica de Shopify.
  - Se generó y exportó el workflow DS-05 para renovar tokens.
  - Se borraron workflows duplicados en n8n que causaban conflictos de ID y se desactivaron los logs de debug excesivos.
  - Se activaron los flujos DS-T2 y DS-05 en la BD de n8n.
  - Se corrieron las pruebas unitarias (`node --test`) pasando todas con éxito.
- **Evidencia (salidas de pruebas, capturas enmascaradas):** 
  - Las pruebas unitarias pasaron: `ℹ pass 6 \n ℹ fail 0`
- **Qué NO se probó:** 
  - La ejecución real (`modo_pedidos = 'real'`) en Shopify porque faltan las credenciales en el `.env`.
  - La prueba e2e desde WhatsApp, ya que Meta (YCloud) bloqueó el envío/recepción de mensajes hasta que aprueben el RUT del negocio.
- **Desvíos del plan y por qué:** Ninguno lógico. Se decidió avanzar hasta el límite de la integración por los bloqueos externos.
- **Decisiones que necesito del dueño o de Claude:** 
  - Añadir las claves de Shopify al `.env` y el Token de Cloudflare.
  - Esperar la aprobación del RUT en Meta para hacer la prueba final del bot.
