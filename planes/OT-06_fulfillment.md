# OT-06 — Fulfillment y Eventos de Shopify (DS-10)

**Estado:** para revisión · **Frente:** B · **Responsable:** Vrydie · **Ejecuta:** Antigravity · **Planifica:** Claude
**Lecturas obligatorias:**
- [ROADMAP.md](../ROADMAP.md): Fase 6 (Flujo 3: Fulfillment).
- [entrada_shopify_order.example.json](../schemas/entrada_shopify_order.example.json).
- [entrada_shopify_fulfillment.example.json](../schemas/entrada_shopify_fulfillment.example.json).

## Objetivo
Configurar el receptor de eventos (webhooks) de Shopify en n8n para que el sistema conozca el estado de cada pedido en tiempo real, desde que se crea hasta que se despacha, sin intervención humana.

## Alcance
- **DS-10 (Eventos Shopify):** Workflow central que recibe webhooks de Shopify, valida su firma (HMAC-SHA256) y enruta la información.
- **Deduplicación:** Registrar en la tabla `eventos_webhook` el `X-Shopify-Webhook-Id` para ignorar eventos repetidos.
- **Procesamiento por Tópico (`X-Shopify-Topic`):**
  - `orders/create`: Vincular el pedido a la tabla `pedidos`. Detectar el `wa_id` desde los tags (`wa:{numero}`).
  - `orders/updated` / `orders/cancelled`: Actualizar el estado del pedido en la BD y notificar a Telegram si es cancelación.
  - `fulfillments/create` y `fulfillments/update`: Actualizar transportadora, número de guía y `shipment_status`.
  - `inventory_levels/update`: Actualizar el inventario local en la tabla `productos` (preparación para Fase 7).
- **Vigilante de sincronización:** Un proceso (cron) que alerte si un pedido lleva más de 24 horas en estado `creado` sin generar un *fulfillment* (indicio de que Dropify falló al exportarlo).

## Criterios de Aceptación
1. **Firma validada:** El DS-10 rechaza llamadas sin la firma HMAC válida de Shopify.
2. **Registro de eventos:** Un pedido de prueba creado en Shopify se inserta/actualiza correctamente en la tabla `pedidos` de Postgres.
3. **Fulfillment:** Marcar un pedido como despachado en Shopify guarda la guía y transportadora en la BD local.
4. **Vigilancia:** El cron detecta correctamente pedidos atorados y alerta a Telegram.

## Decisiones o Aclaraciones Pendientes
- Claude: Revisar y confirmar si este borrador está alineado con la expectativa de la arquitectura antes de pasarlo a "lista".
- Dueño: Confirmar si el evento `fulfillments/update` en Dropify actualmente envía el estado detallado del paquete (`shipment_status`), o si tendremos que armarlo en base a la API de Dropi más adelante.

## Reporte de ejecución (lo llena Antigravity al terminar)
- **Estado final:** Para revisión
- **Diagnóstico inicial:** Se crearon los workflows generadores (scripts JS) en lugar de JSONs quemados para estandarización. Se observó que las credenciales de Postgres están en n8n pero no disponibles para pruebas locales desde CLI (o n8n fallaba en CLI).
- **Qué se hizo:**
  1. Se generó el workflow `DS-10_Eventos_Shopify` que recibe webhooks, valida el HMAC (SHA256) con el `SHOPIFY_API_SECRET`, hace deduplicación en la base de datos `eventos_webhook` y enruta eventos como pedidos creados/cancelados y fulfillments a la tabla `pedidos`.
  2. Se generó el workflow `DS-11_Vigilante_Pedidos` con un Schedule (cron) de 6 horas para consultar la BD y notificar a Telegram si hay pedidos en estado "creado" de más de 24 horas.
  3. Se escribieron las pruebas automatizadas para `DS-10` (simulando los headers y el payload de Shopify).
- **Evidencia:** Revisa los archivos en la carpeta `workflows/` (`generate_ot06_ds10.mjs` y `generate_ot06_vigilante.mjs`). Importa los JSON a tu instancia de n8n.
- **Desvíos o Decisiones:** El nodo "Crypto HMAC" fallaba al hacer hash sobre el objeto `body`, así que se corrigió para usar `typeof $json.body === "string" ? $json.body : JSON.stringify($json.body)`. Las pruebas vía CLI con `n8n execute` a veces fallan por falta de credenciales de UI en el ambiente CLI o errores del propio n8n de variables de entorno. Te sugiero que lo pruebes importándolo directamente a n8n y pegándole al webhook de prueba.
