# Ecosistema de Dropshipping Automatizado con Inteligencia Artificial

**Objetivo Principal:** Construir una "máquina de ventas" autónoma para comercio electrónico bajo el modelo de pago contra entrega (Dropshipping). El sistema busca, evalúa, vende y gestiona pedidos usando agentes de Inteligencia Artificial (IA) y automatizaciones avanzadas, reduciendo el trabajo manual humano al mínimo indispensable.

## 1. ¿Cómo funciona la Máquina de Ventas? (Flujo Principal)
El núcleo del proyecto funciona mediante anuncios en Facebook/Instagram (Meta Ads) que llevan al cliente directamente a un chat de WhatsApp. A partir de ahí, la magia la hace el sistema:
*   **Atracción:** El cliente ve el anuncio y hace clic para enviar un mensaje de WhatsApp.
*   **Atención Inteligente (El Agente IA):** Un bot inteligente con personalidad humana recibe el mensaje en segundos. Este bot está entrenado con todas las objeciones del producto, sabe responder audios (los transcribe) y perfila al cliente.
*   **Cierre de Venta:** El bot confirma la cobertura (si la ciudad tiene envío), toma los datos, y si el cliente confirma, crea el pedido directamente en la tienda de Shopify de forma automática.
*   **Fulfillment (Despacho):** Shopify, conectado a plataformas logísticas como Dropi, envía la orden a la transportadora automáticamente.

## 2. El Módulo "P": El Cazador de Productos Ganadores
Uno de los mayores problemas del e-commerce es saber qué vender. Este sistema soluciona eso con un módulo autónomo que "caza" oportunidades:
*   **Rastreador de Datos:** Todos los días, el sistema descarga el catálogo de proveedores para identificar qué productos están disparando sus ventas (tendencia) y si tienen buen stock.
*   **Inteligencia y Espionaje:** Toma los candidatos y los busca automáticamente en Google Shopping, Falabella, Éxito y AliExpress para comparar precios y ver si hay margen de ganancia real. Además, la IA evalúa si el producto tiene "efecto wow" o resuelve un dolor fuerte.
*   **Fase de Prueba Automatizada:** Si apruebas un producto, la IA escribe el texto de ventas, genera 5 guiones para videos de TikTok/Reels y te deja la campaña publicitaria lista.
*   **El Juez Implacable:** Si el producto se lanza pero gasta mucho dinero en publicidad sin vender, el sistema apaga el anuncio solo, evitando que pierdas dinero.

## 3. El "Piloto Automático" (Retención y Logística)
La venta contra entrega depende de que el cliente realmente reciba y pague el paquete. Para asegurar esto, el sistema incluye:
*   **Guardián de Stock:** Si el proveedor se queda sin unidades, el sistema apaga automáticamente los anuncios de Facebook para no gastar dinero ofreciendo algo agotado.
*   **Postventa por WhatsApp:** Envía mensajes automáticos al cliente cuando el pedido es despachado y el día que está en reparto (recordándole que tenga el efectivo listo).
*   **Optimización (API de Conversiones):** Cada vez que se entrega un paquete con éxito, el sistema le avisa a Facebook en secreto para que el algoritmo busque más clientes como ese.

## 4. Arquitectura Tecnológica (Detrás de escena)
Todo esto se construye utilizando tecnología robusta para que funcione 24/7 sin interrupciones:
*   **Shopify:** Funciona como la "vitrina" que da confianza al cliente y como la base de datos central de los pedidos.
*   **n8n (Automatización):** Es el cerebro del proyecto. Un servidor propio (sin depender de plataformas costosas de terceros) que conecta todas las piezas y dirige los flujos lógicos.
*   **WhatsApp Cloud API:** La conexión oficial de Meta para enviar y recibir los mensajes de WhatsApp sin riesgo de que bloqueen el número.
*   **Base de Datos Postgres:** Almacena la memoria de las conversaciones del bot y el historial de pedidos para que el Agente IA no pierda el hilo.
*   **LLMs (Large Language Models):** Los motores de inteligencia artificial (como GPT-4 o Gemini) que procesan el lenguaje y actúan como los vendedores expertos.
