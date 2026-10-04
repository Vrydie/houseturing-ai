# OT-06 — Prueba Shopify → Dropi (Fase 0.4, riesgo #1)

**Estado:** lista (precondiciones del dueño pendientes) · **Frente:** A · **Responsable:** dueño · **Ejecuta:** Antigravity · **Planifica:** Claude
**Prioridad:** máxima. Si Dropi no importa los pedidos creados por API, cambia el diseño de DS-T2 y de todo el checkout por WhatsApp.
**Depende de:** OT-02 (tienda y producto de ejemplo CM-135) y los scopes de pedidos de la app (añadidos el 1-oct-2026).

**Lecturas obligatorias:**
- [AGENTS.md](../AGENTS.md): §3 secretos, §4 acciones con efectos reales.
- [ROADMAP.md](../ROADMAP.md): Fase 0.4, D5, D6 y D7.
- [schemas/salida_shopify_pedido.graphql](../schemas/salida_shopify_pedido.graphql): formato de partida del pedido.

---

## Por qué
DS-T2 creará pedidos contraentrega en Shopify con `orderCreate`, y Dropify debe pasarlos a Dropi con el SKU, el celular, la dirección, la ciudad, el departamento y el valor a recaudar correctos. Nadie lo ha probado. Esta OT lo prueba **con un solo pedido marcado TEST, cancelado antes del despacho**, y deja escrito el formato exacto que funciona. Ese formato es el contrato que el Frente B usa para corregir DS-T2.

## Precondiciones del dueño (Antigravity no puede hacerlas)
- [x] **P1. Dropify:** instalado en Shopify y el producto CM-135 vinculado a Dropi con el **mismo SKU**. Confirmarlo en el panel de Dropify.
- [x] **P2. Método de pago manual** en Shopify (Configuración → Pagos → Métodos de pago manuales) llamado exactamente **`Pago contra entrega`**. Si ya existe con otro nombre, anota el nombre exacto aquí: ______
- [x] **P3. Datos de envío de prueba** en `infra/.env` (nunca en archivos versionados): una dirección real tuya, porque Dropi valida la dirección.
  ```
  PRUEBA_NOMBRE=
  PRUEBA_APELLIDO=
  PRUEBA_CELULAR=        # 10 dígitos, empieza por 3, sin +57
  PRUEBA_DIRECCION=
  PRUEBA_BARRIO=
  PRUEBA_CIUDAD=         # como la escribe Dropi, p. ej. Cali
  PRUEBA_PROVINCE_CODE=  # código de departamento de Shopify, p. ej. VAC
  ```
- [x] **P4. Ventana de prueba:** el dueño tiene el panel de Dropi abierto durante la prueba para revisar el pedido y **cancelarlo apenas aparezca**. Si puedes, pregunta antes a soporte de Dropi a qué hora corta el despacho y si pueden pausar el envío automático de tu cuenta ese día.

Si falta alguna, marca la OT como `bloqueada`, anota cuál y detente.

## Reglas de esta OT (además de AGENTS.md)
- **Un solo pedido a la vez.** Nunca se crea un segundo pedido si el primero no está cancelado en Dropi y en Shopify.
- **Siempre:** tag `TEST`, nota `PEDIDO DE PRUEBA OT-06 - NO DESPACHAR` y atributo `prueba=ot-06`.
- **Modo simulación por defecto** en los dos scripts: imprimen el payload y lo que harían, sin escribir. Solo escriben con `--aplicar`. En la salida, el celular y la dirección van enmascarados (`300***1122`).
- **Gate:** la simulación se pega en el reporte y **se espera el OK del dueño o de Claude** antes de cada `--aplicar`.
- Máximo **3 intentos** (ver paso 5). Si ninguno funciona, se detiene y se reporta.
- No se toca nada del Frente B (`workflows/`, DS-T2). El resultado se le entrega en el reporte.

## Pasos

**1. Script `tienda/scripts/prueba_pedido_dropi.mjs`** (token con *client credentials*, API `2026-07`):
- Lee la variante del producto por SKU `CM-135` (GID y precio) y verifica que el precio de la variante sea **219900**. Si no coincide, se detiene.
- **Idempotencia:** antes de crear, busca pedidos con `tag:TEST` creados en las últimas 24 h que tengan `prueba=ot-06` y no estén cancelados. Si hay uno, no crea nada y lo muestra.
- Arma `orderCreate` con el formato de `schemas/salida_shopify_pedido.graphql`:
  - `currency: COP`, `financialStatus: PENDING`, `phone: +57<PRUEBA_CELULAR>`.
  - `lineItems`: la variante CM-135, `quantity: 1`, `priceSet` 219900 COP.
  - `shippingAddress` y `billingAddress`: nombre, apellido, `address1` = dirección, `address2` = barrio, `city`, `provinceCode`, `countryCode: CO` y `phone`.
  - `customer.toUpsert`: nombre, apellido y teléfono.
  - `transactions`: `kind: SALE`, `status: PENDING`, `gateway: "Pago contra entrega"` (o el nombre de P2) y monto 219900.
  - `tags: ["TEST", "canal:whatsapp", "wa:57<PRUEBA_CELULAR>"]`, `note` y `customAttributes` (`wa_id`, `conversacion_id: prueba-ot-06`, `prueba: ot-06`).
  - `options: { sendReceipt: false, sendFulfillmentReceipt: false }`.
- Sin `--aplicar`: imprime el payload (enmascarado) y "SIMULACIÓN: no se creó nada". Con `--aplicar`: crea el pedido e imprime `name`, `id` y `userErrors`.

**2. Simulación → OK → crear.** Ejecuta sin `--aplicar`, pega la salida en el reporte y **espera el OK**. Luego `--aplicar` una sola vez y anota la hora exacta.

**3. Seguimiento (sin escribir nada):** cada 2 min, hasta 30 min, consulta el pedido por Admin API (tags, `displayFulfillmentStatus`, `fulfillmentOrders`, nota y atributos) y anota cualquier cambio que haga Dropify. Avisa al dueño en cuanto haya señales de importación.

**4. Verificación en Dropi (la hace el dueño, Antigravity anota):** el pedido aparece en Dropi y estos campos están bien:
| Campo | Esperado | ¿Correcto? |
|---|---|---|
| Producto / SKU | CM-135, 1 unidad | |
| Valor a recaudar | $219.900 | |
| Modalidad | Contraentrega | |
| Nombre y celular | Los de P3 | |
| Dirección y barrio | Los de P3 | |
| Ciudad y departamento | Los de P3 | |
| Transportadora asignada | (anotar) | |
| Minutos hasta aparecer | (anotar) | |

**El dueño cancela el pedido en Dropi de inmediato** y lo confirma en el reporte. Capturas del panel de Dropi con los datos personales tapados en `planes/evidencia/OT-06/`.

**5. Si no aparece en Dropi en 30 min o llega con campos mal**, se cancela lo que haya y se prueba la siguiente variante, cada una con su propia simulación y su OK:
- **Intento 2:** igual, pero sin `transactions` (solo `financialStatus: PENDING`).
- **Intento 3:** `draftOrderCreate` con los mismos datos → `draftOrderComplete(paymentPending: true)`.
- Si ninguno funciona: el dueño pregunta a soporte de Dropi qué formato espera Dropify (nombre de la pasarela, formato del teléfono, ciudad o departamento) y la OT queda `bloqueada` con la respuesta.

**6. Cancelar en Shopify:** script `tienda/scripts/cancelar_pedido_prueba.mjs <id>`, en simulación por defecto. Solo cancela pedidos con tag `TEST` y atributo `prueba=ot-06` (si no, se niega). `orderCancel` con `reason: OTHER`, `restock: true`, `notifyCustomer: false`, sin reembolso. Va **después** de cancelar en Dropi. Anota si cancelar en Shopify también cambia algo en Dropi.

**7. Dejar el formato escrito:**
- En `schemas/salida_shopify_pedido.graphql`, encima del bloque 1, un comentario `VALIDADO CON DROPI (OT-06, <fecha>)` con las variables exactas que funcionaron (datos de ejemplo, no los reales) y lo que hace falta y lo que no.
- Añade los nombres `PRUEBA_*` (sin valores) a `.env.example`.

## Criterios de aceptación
- [x] Un pedido TEST creado por API llega a Dropi con los 6 primeros campos de la tabla correctos.
- [x] Cancelado en Dropi antes del despacho y luego en Shopify. Sin cobros de flete.
- [x] Simulaciones, salidas de `--aplicar` e idempotencia (una segunda simulación ve el pedido existente y no crea otro) pegadas en el reporte.
- [x] Formato validado escrito en `schemas/salida_shopify_pedido.graphql`.
- [x] Ningún dato personal de la prueba en archivos versionados ni en capturas.

## Para el Frente B
DS-T2 (`workflows/DS-T2_crear_pedido.json`) debe usar el formato que valide esta OT. Hoy le faltan `lineItems`, `countryCode`, `provinceCode`, `transactions`, el precio de `ofertas`, la comprobación de `confirmado_por_cliente`, la revalidación de cobertura, la idempotencia y guardar el pedido en `pedidos` (ROADMAP Fase 5). La corrección va en una ronda de OT-04 aparte.

## Reporte de ejecución
*Ejecutado el 1-oct-2026 por Claude junto al dueño, que pidió hacerlo en la sesión (no por Antigravity).*

- **Estado final:** para revisión. **La prueba pasó en el intento 1 corregido:** un pedido creado por la Admin API llegó a Dropi con los 6 campos correctos y se canceló antes del despacho.
- **Precondiciones:**
  - P1: SKU CM-135 igual en Shopify y Dropi. Dropify tenía **dos** productos de Shopify vinculados al mismo producto de Dropi: un duplicado importado el 1-oct a las 23:12, sin plantilla, a $260.000. El dueño lo desvinculó en Dropify y Claude lo **archivó** en Shopify (simulación → OK → aplicar → segunda simulación "sin cambios"). Queda un solo vínculo: `9032076853366` ↔ Dropi `1870930`.
  - P2 y P3: listas según el dueño. P3 verificada (7 variables con valor, celular de 10 dígitos que empieza por 3).
  - P4: el dueño tuvo Mis Pedidos abierto durante toda la prueba.
  - Dropify → Configuración General, según el dueño: "Sincronizar órdenes automáticamente" activada y "Sincronizar órdenes pagadas" desactivada.
- **Qué se hizo:** simulación → OK → `--aplicar` (falló, ver desvíos) → corrección → nueva simulación → OK → `--aplicar` (#1001) → verificación del dueño en Dropi → cancelación en Dropi → simulación de cancelación → OK → cancelación en Shopify → segunda simulación "ya está cancelado".
- **Evidencia:** [evidencia/OT-06/README.md](evidencia/OT-06/README.md), con la línea de tiempo, la tabla del paso 4, el desglose económico de Dropi y la idempotencia. Datos personales enmascarados.
- **Intentos:** intento 1 rechazado por Shopify antes de crear el pedido (ver desvíos). Intento 1 corregido: **éxito**. No hicieron falta los intentos 2 ni 3.
- **Qué NO se probó:**
  - El seguimiento por API cada 2 min durante 30 min (paso 3): el dueño vigiló Dropi directamente y apareció en ~3 min. Se consultó el pedido después: Dropify le puso el tag `Order sent to dropi`.
  - Si cancelar en Shopify cambia algo en Dropi: NO VERIFICADO, porque ya estaba cancelado en Dropi.
  - Que no hubo cobro de flete: en el "Historial de Cartera" del pedido no aparece ningún movimiento, y la cartera estaba en $0. Conviene que el dueño lo revise mañana.
  - Pedidos de 2 unidades o con precio de oferta, ciudades fuera de Cali y otro producto.
- **Desvíos del plan y por qué:**
  1. **Se quitó `customer.toUpsert`** (el paso 1 lo pedía). Shopify lo rechaza sin email o id: `OrderCreateUpsertCustomerAttributesInput requires at least one of id, email`. Nombre y teléfono siguen en `shippingAddress`, y Dropi los tomó bien. El contrato se corrigió igual.
  2. **`restock: false` en vez de `true`** (el paso 6 lo pedía). `orderCreate` no descontó inventario (stock 0 antes y después), así que devolverlo habría inventado una unidad.
- **Hallazgos para el resto del proyecto:**
  - **Dropi no despacha solo:** los pedidos entran como PENDIENTE CONFIRMACION. En producción alguien, o un flujo, tiene que confirmarlos.
  - **Stock:** Shopify muestra 0 aunque Dropi tiene 422. Dropify no ofrece sincronizar inventario en su configuración, así que **D7 no se cumple tal como está escrita**: el guardián de stock (DS-21) no puede leer el stock de Shopify. Hay que leerlo de la API de Dropi u otra fuente.
  - **Margen real del producto de ejemplo:** $32.241 por pedido entregado (venta $219.900; envío $17.647; comisión $10.113; proveedor $159.900).
- **Para el Frente B:** DS-T2 debe seguir el formato validado en `schemas/salida_shopify_pedido.graphql`: sin `customer`, con `transactions` "Pago contra entrega", dirección completa y tag `TEST` en pruebas. Además de lo que ya lista la sección "Para el Frente B".
- **Decisiones del dueño (2-oct-2026):**
  1. **Confirmación de pedidos en Dropi: automatizarla.** Requiere la API de integraciones de Dropi (`DROPI_INTEGRATION_KEY`). Hay que confirmar con Dropi que esa API permite confirmar pedidos. Va en una OT del Frente B.
  2. **Dropify se queda:** es lo que lleva el pedido de Shopify a Dropi. El stock para el guardián (D7) se leerá de la API de Dropi, no de Shopify. Hay que actualizar D7 en el ROADMAP en un PR compartido.
  3. **Margen:** el dueño lo tendrá en cuenta al elegir el producto definitivo.
