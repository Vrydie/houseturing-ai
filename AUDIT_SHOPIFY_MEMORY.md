# 📋 MEMORIA TÉCNICA Y CHECKLIST DE CONTROL: BOT SHOPIFY (`houseturing-ai`)

> **Fecha de Auditoría:** 15 de Octubre de 2026  
> **Perfil Auditor:** Arquitecto de Software Senior & Auditor de Seguridad E-Commerce  
> **Estado del Repositorio:** Fase de desarrollo activo / Transición de arquitectura local a nube (Railway + Neon DB + Meta Cloud API)  
> **Objetivo:** Radiografía exhaustiva de componentes existentes vs. faltantes, matriz de riesgos, evaluación por ejes críticos y bitácora viva de control.

---

## 1. 🗺️ Radar del Estado Actual del Proyecto

| Módulo / Integración | Estado | Archivos Involucrados | Riesgo Actual | Descripción Operativa |
| :--- | :--- | :--- | :--- | :--- |
| **Ingesta WhatsApp (Webhook)** | 🟢 **100% Funcional** | `workflows/DS-01_Entrada_WhatsApp.json` | Bajo | Webhook directo con Meta Cloud API verificado en Railway (`/webhook/whatsapp`). Normalización de texto, ubicación, interactivos y referrals CTWA. |
| **Control de Concurrencia y Debounce** | 🟢 **100% Funcional** | `db/schema.sql` (`ycloud_reclamar`), `DS-01` | Bajo | Debounce atómico en base de datos. Bloqueo pesimista (`FOR UPDATE`), lease de 60s (`agente_ocupado_hasta`) y agregación de ráfagas de mensajes del cliente. |
| **Cerebro Conversacional (LLM)** | 🟢 **100% Funcional** | `workflows/DS-02_Agente_Ventas.json` | Bajo | LangChain ReAct Agent con DeepSeek-Chat. Memoria persistente en Postgres (`mensajes_chat`), inyección de contexto de catálogo (`CM-135`) y prompt dinámico. |
| **Despacho WhatsApp (Salida)** | 🟢 **100% Funcional** | `workflows/DS-03_Enviar_WhatsApp.json` | Bajo | Envío con Meta Graph API v21.0, token permanente de System User, segmentación de hasta 3 burbujas, ritmo de tipeo humano y tolerancia a fallos en lectura. |
| **Consulta de Cobertura Contraentrega** | 🟢 **100% Funcional** | `workflows/DS-T1_consultar_cobertura.json` | Bajo | Tool n8n conectada a tabla `cobertura` normalizada (ciudades de Colombia, transportadoras aliadas y días de entrega). |
| **Creación de Pedidos Contraentrega** | 🟡 **Parcial (Simulado OK / Real Pendiente)** | `workflows/DS-T2_crear_pedido_contraentrega.json` | Medio | Modo `simulado` crea pedidos locales con ID `SIM-X`. Modo `real` (Shopify GraphQL `orderCreate`) codificado pero pendiente de token real de Shopify. |
| **Escalamiento a Humano** | 🟢 **100% Funcional** | `workflows/DS-T5_escalar_a_humano.json` | Bajo | Desactiva el bot en `conversaciones` (`bot_activo = false`), registra motivo y prepara traspaso. |
| **Puente Humano (Alertas Telegram)** | 🟡 **Parcial (Lógica OK / Credencial Pendiente)** | `workflows/DS-04_Puente_Humano.json` | Medio | Genera el aviso estructurado de escalamiento. El nodo Telegram requiere bot token y chat ID válidos del operador. |
| **Generador Link de Pago Online** | 🔴 **Pendiente (Stub)** | `workflows/DS-T3_generar_link_pago.json` | Medio | Retorna stub informativo ("Pago en línea no disponible"). Falta mutación `draftOrderCreate` para pasarelas en línea. |
| **Webhook Ingesta Shopify** | 🔴 **Borrador / Stub** | `workflows/DS-10_Eventos_Shopify.json` | Alto | Usa `manualTrigger`, validación HMAC con string mockeado (`mock-hmac`), y sintaxis de queryParameters obsoleta. |
| **Vigilante de Pedidos Estancados** | 🟡 **Parcial** | `workflows/DS-11_Vigilante_Pedidos.json` | Medio | Cron cada 6h detecta pedidos sin despachar >24h. Alerta vía Telegram pendiente de credenciales reales. |
| **Renovación Token Shopify** | ⚪ **No Aplica a Custom App** | `workflows/DS-05_Renovar_token.json` | Bajo | Diseñado para OAuth público (`client_credentials`). Para Apps Privadas de Shopify se usa un Token de Acceso Estático (`shpat_`). |
| **Sincronización Bidireccional de Stock** | 🔴 **Pendiente** | N/A (Solo SQL inicial) | Alto | No hay escucha activa de `inventory_levels/update` ni de cambios de precio desde Shopify Admin hacia Neon DB. |

---

## 2. 🚨 Hallazgos Críticos y Vulnerabilidades Detectadas

### [P0 - BLOQUEANTE / CRÍTICO]

#### **SH-01: Verificación Criptográfica HMAC Mockeada en Webhooks de Shopify**
- **Ubicación:** `workflows/DS-10_Eventos_Shopify.json` &rarr; Nodos `Crypto HMAC` y `Validar HMAC` (Líneas 18-53).
- **Descripción:** El nodo `Validar HMAC` compara `"mock-hmac" === "mock-hmac"`. Además, el nodo `Webhook` está configurado como `manualTrigger` en vez de un Webhook HTTP accesible con captura de `rawBody`.
- **Impacto Operativo:** Cualquier atacante podría enviar peticiones POST falsificadas simulando cancelaciones de pedidos, pagos aprobados o devoluciones sin firma legítima de Shopify.
- **Estado de Aplicabilidad:** **Prioritario para cuando se conecte Shopify.** (Actualmente no bloquea el bot de WhatsApp porque opera en modo simulado).

#### **SH-02: Parámetros SQL Desalineados en Nodos de Integración Shopify y Webhooks**
- **Ubicación:** `workflows/DS-10_Eventos_Shopify.json` (Línea 89), `workflows/DS-05_Renovar_token.json` (Línea 60).
- **Descripción:** Nodos de Postgres configurados con `"options": { "queryParameters": "..." }` en lugar de `"options": { "queryReplacement": "={{ [...] }}" }`.
- **Impacto Operativo:** Error en runtime `NodeOperationError: there is no parameter $1`, provocando el aborto de la transacción de deduplicación de eventos.
- **Estado de Aplicabilidad:** **Inmediato.** Debe normalizarse bajo el estándar ya reparado en `DS-T2`.

---

### [P1 - ALTA PRIORIDAD]

#### **SH-03: Ausencia de Generación de Draft Orders para Pago en Línea (Pasarelas PSE / Nequi / Tarjetas)**
- **Ubicación:** `workflows/DS-T3_generar_link_pago.json` (Líneas 1-52).
- **Descripción:** El tool es un stub estático que aborta con `El pago en línea todavía no está disponible`.
- **Impacto Operativo:** Pérdida de ventas de clientes que no disponen de efectivo para contraentrega o prefieren pagar anticipadamente con tarjeta/PSE.
- **Estado de Aplicabilidad:** **Fase 2.** Requiere credenciales de Shopify Storefront o Admin API para emitir `invoiceUrl`.

#### **SH-04: Credencial Hardcodeada Huérfana de Telegram**
- **Ubicación:** `workflows/DS-04_Puente_Humano.json` (Línea 91), `workflows/DS-11_Vigilante_Pedidos.json` (Línea 82).
- **Descripción:** Los nodos de Telegram apuntan al ID de credencial inexistente `T0lm7WR4FJtRzjXV`.
- **Impacto Operativo:** Las alertas de supervisión humana y pedidos atascados fallan silenciosamente o no se entregan al operador.
- **Estado de Aplicabilidad:** **Inmediato si se desea atención humana.** Se resuelve creando la credencial en n8n o usando notificaciones alternativas por WhatsApp.

#### **SH-05: Falta de Sincronización en Tiempo Real de Inventario (Riesgo de Sobreventa / Overselling)**
- **Ubicación:** Tabla `productos` en base de datos vs. Inventario Shopify.
- **Descripción:** El stock en Neon DB (`stock_ultimo`) es estático y no se actualiza automáticamente cuando ocurren ventas por la web o compras de otros canales.
- **Impacto Operativo:** El bot de WhatsApp puede confirmar pedidos de productos agotados si el stock se terminó en la tienda online.
- **Estado de Aplicabilidad:** **Fase 2.** Requiere suscripción al webhook `inventory_levels/update`.

---

### [P2 - DEUDA TÉCNICA / MEJORAS DE RESILIENCIA]

#### **SH-06: Manejo de Rate Limit de Shopify (Cost Points & Leaky Bucket)**
- **Ubicación:** `workflows/DS-T2_crear_pedido_contraentrega.json` &rarr; Nodo `Shopify API`.
- **Descripción:** La llamada HTTP a GraphQL Admin API no evalúa los headers `extensions.cost.throttleStatus` ni responde con reintentos programados si recibe HTTP 429.
- **Impacto Operativo:** En promociones o ráfagas publicitarias altas (anuncios CTWA con cientos de clics simultáneos), peticiones concurrentes de compra podrían ser rechazadas por Shopify.

#### **SH-07: Timeouts y Respuesta Temprana en Webhooks de Shopify**
- **Ubicación:** `workflows/DS-10_Eventos_Shopify.json`.
- **Descripción:** Shopify exige que todo webhook responda HTTP 200 en menos de 5 segundos. Si la base de datos o el procesamiento tarda más, Shopify reintenta hasta 19 veces y termina desactivando el webhook.
- **Mitigación:** Asegurar que el nodo `200 OK temprano` responda inmediatamente antes de ejecutar inserciones pesadas en Postgres.

---

## 3. 🛠️ Plan de Acción y Checklist Maestro de Implementación

### Fase 1: Blindaje Operativo Inmediato (WhatsApp & Base de Datos)
- [x] **WA-01:** Conectar webhook de Meta Cloud API con handshake `hub.challenge` validado.
- [x] **WA-02:** Generar token permanente de Usuario del Sistema (sin expiración) y enlazarlo en `config`.
- [x] **WA-03:** Configurar tolerancia a fallos (`continueRegularOutput`) en `HTTP marcar leído`.
- [x] **WA-04:** Configurar variables dinámicas del prompt de la asesora (`Valentina`, personalidad, tono, precios) en `config.agente_prompt_valores`.
- [x] **WA-05:** Reparar sintaxis de normalización de ciudades (`normalizeCity`) en `DS-T2`.
- [x] **WA-06:** Corregir inyección de parámetros SQL (`queryReplacement`) y alias de columna (`ciudad AS ciudad_oficial`) en `DS-T2`.
- [ ] **WA-07:** Configurar credencial de Telegram válida en n8n para que `DS-04 Puente Humano` entregue alertas al operador.

### Fase 2: Conexión Real con Shopify (Admin GraphQL API)
- [ ] **SH-C01:** Crear App Personalizada en Shopify Admin (`Configuración` &rarr; `Apps y canales de venta` &rarr; `Desarrollar apps`).
- [ ] **SH-C02:** Asignar scopes mínimos requeridos:
  - `write_orders`, `read_orders` (creación y consulta de pedidos).
  - `write_draft_orders`, `read_draft_orders` (links de pago).
  - `read_products`, `read_inventory` (consulta de variantes y existencias).
- [ ] **SH-C03:** Guardar el Token de Acceso (`shpat_...`) en la base de datos Neon:
  ```sql
  UPDATE config SET valor = 'shpat_xxxxxxxxxxxxxxxx' WHERE clave = 'shopify_access_token';
  UPDATE config SET valor = 'tu-tienda.myshopify.com' WHERE clave = 'shopify_tienda';
  ```
- [ ] **SH-C04:** Cambiar `modo_pedidos` a `'real'` en la tabla `config`:
  ```sql
  UPDATE config SET valor = 'real' WHERE clave = 'modo_pedidos';
  ```
- [ ] **SH-C05:** Probar la mutación GraphQL `orderCreate` en vivo desde WhatsApp y verificar la aparición del pedido en el panel de Shopify con tag `canal:whatsapp`.

### Fase 3: Pasarela de Pago en Línea (Draft Orders)
- [ ] **SH-D01:** Reemplazar el stub en `workflows/DS-T3_generar_link_pago.json` por la mutación `draftOrderCreate`.
- [ ] **SH-D02:** Extraer `invoiceUrl` de la respuesta de Shopify para enviárselo directamente al cliente por WhatsApp.
- [ ] **SH-D03:** Configurar webhook `orders/paid` para marcar el pedido como pagado y reactivar la conversación si estaba pendiente.

### Fase 4: Webhooks Entrantes de Shopify y Deduplicación
- [ ] **SH-W01:** Cambiar el disparador en `workflows/DS-10_Eventos_Shopify.json` a `n8n-nodes-base.webhook` con `path: shopify-events` y `options.rawBody: true`.
- [ ] **SH-W02:** Implementar validación estricta HMAC-SHA256 comparando contra `X-Shopify-Hmac-Sha256` usando `crypto.timingSafeEqual`.
- [ ] **SH-W03:** Deduplicar eventos insertando en `eventos_webhook` mediante `ON CONFLICT (fuente, evento_id) DO NOTHING`.
- [ ] **SH-W04:** Procesar eventos críticos:
  - `orders/fulfilled`: Guarda guía de transporte y envía mensaje automático al comprador.
  - `orders/cancelled`: Libera reserva y actualiza estado a `cancelado`.
  - `inventory_levels/update`: Actualiza disponibilidad de producto en Neon DB.

---

## 4. 🧩 Diffs y Código de Referencia para Bloques Faltantes

### A. Verificación Criptográfica Segura de Webhooks de Shopify (Node.js Code Node)

Para sustituir el mock en `DS-10`:

```javascript
// Nodo: Validar Firma HMAC Shopify
const crypto = require('crypto');

const secret = $env['SHOPIFY_API_SECRET'] || (await $getWorkflowStaticData('global')).shopifySecret;
const hmacHeader = $input.first().json.headers['x-shopify-hmac-sha256'];

if (!hmacHeader || !secret) {
  return [{ json: { autorizado: false, motivo: 'Faltan cabeceras o secreto' } }];
}

// Obtener el buffer crudo sin alteraciones de serialización JSON
let rawBody;
try {
  rawBody = await this.helpers.getBinaryDataBuffer(0, 'data');
} catch (e) {
  rawBody = Buffer.from($input.first().json.raw || JSON.stringify($input.first().json.body), 'utf8');
}

const calculatedHmac = crypto
  .createHmac('sha256', secret)
  .update(rawBody)
  .digest('base64');

const hashCalculado = Buffer.from(calculatedHmac, 'utf8');
const hashRecibido = Buffer.from(hmacHeader, 'utf8');

const esValido = hashCalculado.length === hashRecibido.length && 
                 crypto.timingSafeEqual(hashCalculado, hashRecibido);

if (!esValido) {
  return [{ json: { autorizado: false, motivo: 'Firma HMAC inválida' } }];
}

return [{ json: { autorizado: true, evento: JSON.parse(rawBody.toString('utf8')) } }];
```

---

### B. Mutación GraphQL para Links de Pago Online (`draftOrderCreate`)

Para implementar en `DS-T3`:

```graphql
mutation GenerarLinkPago($input: DraftOrderInput!) {
  draftOrderCreate(input: $input) {
    draftOrder {
      id
      name
      invoiceUrl
      status
      totalPrice
    }
    userErrors {
      field
      message
    }
  }
}
```

**Variables del Payload:**
```json
{
  "input": {
    "currencyCode": "COP",
    "lineItems": [
      {
        "variantId": "gid://shopify/ProductVariant/48848562651254",
        "quantity": 1
      }
    ],
    "shippingAddress": {
      "firstName": "Samuel",
      "lastName": "Vargas",
      "address1": "Carrera 85a # 13a-95",
      "city": "Cali",
      "province": "Valle del Cauca",
      "country": "Colombia",
      "phone": "+573154899983"
    },
    "tags": ["canal:whatsapp", "pago:online"],
    "note": "Generado automáticamente por Valentina Bot"
  }
}
```

---

## 5. 💡 Recomendación de Ejecución Estratégica

Dado que el proyecto se encuentra en desarrollo activo:

1. **Prioridad 1 (Completada):** El canal conversacional de WhatsApp ya recibe, procesa con IA (Valentina), valida cobertura y registra pedidos contraentrega en base de datos.
2. **Siguiente paso lógico:** Cuando dispongas de la tienda de Shopify, solo necesitas generar el token privado (`shpat_...`) y cambiar `modo_pedidos = 'real'` en Neon. Toda la estructura de GraphQL ya está programada para recibirlo.
3. **Fase final:** Activar los webhooks de retorno (`DS-10`) para que cuando la bodega empaque y ponga la guía de Servientrega/Envía en Shopify, el bot le notifique automáticamente al cliente por WhatsApp sin intervención humana.
