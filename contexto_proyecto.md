# Contexto General del Proyecto: Ecosistema Dropshipping Altamente Automatizado

## 1. Resumen Ejecutivo
El objetivo del proyecto es construir un modelo de negocio de e-commerce (Dropshipping) centrado en un "Producto Estrella", diseñado para operar con la máxima automatización posible. El sistema captará tráfico de pago, delegará la atención al cliente y el cierre de ventas a un Agente de Inteligencia Artificial a través de WhatsApp, procesará los pagos/pedidos automáticamente y gestionará la logística de envío sin intervención humana directa en el flujo nominal.

## 2. Stack Tecnológico
*   **Orquestador Central:** `n8n` (Instancia local ejecutándose en el puerto 5678). Será el cerebro que conectará todas las APIs.
*   **Atracción de Tráfico:** `Meta Ads` (Campañas de conversión/mensajes dirigidas a WhatsApp o Formularios de Leads).
*   **Canal de Ventas:** `WhatsApp` (Vía API Cloud oficial, Evolution API o Baileys, gestionado por n8n).
*   **Cierre de Ventas (IA):** Modelo LLM (ej. OpenAI/Gemini/Claude) integrado en n8n actuando como agente de ventas persuasivo.
*   **E-commerce Backend:** `Shopify` (Gestión de catálogo, creación de carritos de compra y checkout).
*   **Logística y Fulfillment:** `Dropi` (Plataforma de dropshipping en LATAM, conectada a Shopify para envíos y recaudo de Pago Contra Entrega).

## 3. Flujos de Automatización Requeridos (Lo que n8n debe construir)

### Flujo 1: Generación y Atención de Leads (Top of Funnel)
*   **Trigger:** Usuario hace clic en el anuncio de Meta y envía un mensaje a WhatsApp (o llena un Lead Ad).
*   **Acción:** n8n captura el webhook, extrae el número/nombre y le pasa el contexto al Agente de IA.
*   **Resultado:** La IA responde en segundos, perfila al cliente y responde dudas del producto estrella.

### Flujo 2: Cierre de Venta y Checkout (Middle of Funnel)
*   **Trigger:** El cliente indica intención de compra en el chat.
*   **Acción:** La IA solicita los datos de envío y n8n se comunica con la API de Shopify (Storefront/Admin API).
*   **Resultado:** Se genera un enlace de pago único (Checkout de Shopify) con los datos prellenados, o se registra un pedido en modo "Pago Contra Entrega", enviando la confirmación al chat de WhatsApp.

### Flujo 3: Fulfillment y Logística (Bottom of Funnel)
*   **Trigger:** La orden se marca como "Pagada" o "Pendiente de Recaudo" en Shopify.
*   **Acción:** La integración nativa de Dropi toma el pedido automáticamente para su despacho. n8n escucha el cambio de estado.

### Flujo 4: Sincronización Avanzada (El "Piloto Automático")
*   **API de Conversiones (CAPI):** n8n envía los datos de las ventas cerradas de vuelta a Meta Ads para alimentar el algoritmo y mejorar las campañas Advantage+.
*   **Control de Inventario:** n8n consulta diariamente el stock en Dropi. Si el producto estrella se agota, n8n pausa automáticamente la campaña de Meta Ads para evitar gasto en vano.
*   **Post-Venta:** n8n rastrea el estado de la guía en Dropi y le ordena a la IA enviar actualizaciones por WhatsApp ("Tu pedido va en camino", "Déjanos una reseña").

## 4. Perfil y Comportamiento del Agente de IA
*   **Rol:** Asesor de ventas experto y persuasivo.
*   **Conocimiento:** Deberá tener acceso (vía system prompt o RAG en n8n) a toda la información del producto, precios, tiempos de envío, políticas de garantía y manejo de objeciones frecuentes.
*   **Limitaciones:** Si no puede resolver un problema o el cliente se molesta, debe etiquetar la conversación para "Escalamiento a Humano".

## 5. Responsabilidades Manuales (Lo que NO hace el sistema)
*   Creación y subida de nuevos creativos (videos/imágenes) a Meta Ads para evitar fatiga publicitaria.
*   Gestión financiera (recargas de saldo en Dropi, pago de facturas de anuncios).
*   Negociación directa con proveedores (bodegas en Dropi) para mejorar márgenes.
*   Atención al cliente en casos atípicos o devoluciones complicadas de paquetería.

## 6. Instrucción para el LLM Orquestador (Claude)
Se solicita a Claude que actúe como Arquitecto de Software y Project Manager. En base a este contexto, por favor:
1. Diseña un **Plan de Acción paso a paso** (Roadmap) dividido en Fases para construir e integrar este sistema.
2. Prioriza las tareas técnicas desde la configuración del entorno (n8n local) hasta el despliegue final.
3. Define qué esquemas JSON (para webhooks), Prompts base (para la IA) y credenciales (API Keys) necesitaremos recolectar para empezar a programar.
