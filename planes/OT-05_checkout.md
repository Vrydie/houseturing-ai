# OT-05 — Cierre de Venta y Checkout (Herramientas DS-T2 a DS-T5)

**Estado:** en curso · **Frente:** B · **Responsable:** Vrydie · **Ejecuta:** Antigravity · **Planifica:** Claude
**Lecturas obligatorias:**
- [ROADMAP.md](../ROADMAP.md): Fase 5 (Cierre de venta y checkout).
- Contratos de herramientas: [interno_herramientas_agente](../schemas/interno_herramientas_agente.schema.json).
- Mutaciones Shopify: [salida_shopify_pedido](../schemas/salida_shopify_pedido.graphql).

## Objetivo
Desarrollar y conectar las herramientas ("manos") que permiten al Agente Inteligente (DS-02) interactuar con la tienda en Shopify y escalar problemas, completando la automatización transaccional del bot.

## Tareas

### 1. Herramienta DS-T2 (Crear Pedido Contraentrega)
- [x] **Estructura base:** Crear workflow de n8n con `Execute Workflow Trigger`.
- [ ] **Filtros de Seguridad:** Validar que el cliente haya dado un `sí` explícito (`confirmado_por_cliente == true`) y que el celular/dirección estén completos.
- [ ] **Manejo de Precios (Decisión D6):** El workflow debe leer los precios reales desde la base de datos (tabla `ofertas` y `productos`) utilizando el ID del producto, sin confiar ciegamente en el LLM.
- [ ] **Idempotencia:** Verificar en la tabla `pedidos` si este cliente ya hizo este mismo pedido hace menos de 2 horas.
- [x] **Shopify GraphQL:** Llamar a `orderCreate` con estado `PENDING` e incluir tags (`canal:whatsapp`, `wa:{wa_id}`).
- [ ] **Base de Datos:** Registrar el pedido resultante en la tabla `pedidos`.

### 2. Herramienta DS-T3 (Generar Link de Pago)
- [x] Clonar la base de T2, pero esta vez invocar `draftOrderCreate` en Shopify.
- [ ] Extraer y devolver el `invoiceUrl` (el enlace de pago prellenado) hacia el agente.

### 3. Herramienta DS-T4 (Consultar Estado Pedido)
- [x] Crear workflow que busque el `wa_id` en la tabla `pedidos`.
- [x] Retornar el número de guía, transportadora y estado actual al Agente.

### 4. Herramienta DS-T5 (Escalar a Humano / DS-04)
- [x] Actualizar la tabla `conversaciones` para establecer `bot_activo = false`.
- [x] Enviar mensaje/alerta vía Telegram (invocando a DS-04 Puente Humano).

### 5. Inyección en DS-02 y Pruebas
- [x] Actualizar `generate_workflows.mjs` para añadir los nodos `Call Workflow Tool` de T2, T3, T4 y T5, y conectarlos al nodo `AI Agent`.
- [ ] Realizar una prueba integral "End-to-End": Pedir un producto en el test chat y verificar la creación real en Shopify.

## Criterios de aceptación
- [ ] DS-T2 crea un pedido PENDING en Shopify con precios de BD y lo registra en Postgres.
- [ ] DS-T3 genera un draftOrder con un enlace de checkout funcional.
- [ ] El agente usa las herramientas correctamente sin inventar precios y respetando la regla del consentimiento explícito.

## Reporte de ejecución (lo llena Antigravity al terminar)
- Estado final: Pendiente
- Diagnóstico inicial: ...
- Qué se hizo: ...
- Evidencia: ...
