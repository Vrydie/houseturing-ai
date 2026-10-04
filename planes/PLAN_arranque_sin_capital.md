# Plan de arranque sin capital

**Estado:** propuesta (Claude, 4-oct-2026) · **Frente:** A, con propuestas para el Frente B en la §7
**Para quién:** el dueño (§1 a §6 y §8). Samuel (Frente B) solo necesita la §7.

Los datos de WhatsApp, Gemini y túneles vienen de fuentes de terceros (blogs y guías, citadas al final) y se marcan **por confirmar** hasta verlos en la documentación oficial. Lo de Dropi sobre la billetera y las devoluciones lo confirmó el dueño en su propia cuenta el 4-oct-2026.

## 1. Punto de partida
- El dueño no tiene capital: **no hay muestras ni anuncios por ahora** (decisión del 4-oct-2026).
- Ya está hecho: tienda Shopify con el diseño aprobado (plan **Basic**, de pago), prueba Shopify → Dropi superada (OT-06), calculadora de márgenes, bot y herramientas de pedido en revisión (PR #13).
- Falta: un producto definitivo, WhatsApp real y clientes.

## 2. Meta y reglas
- **Meta de 30 días:** 10 pedidos entregados, sin anuncios ni muestras. Es una meta, no un pronóstico.
- **Qué significa en plata** (sopladora a $139.900; 70 % de entrega; la devolución cuesta ida y vuelta): 14 pedidos creados dejan ~9,8 entregados y unos **$330.000 netos**. Es poco, pero financia lo que sigue.
- **Orden de reinversión:** 1) colchón en la billetera de Dropi para devoluciones (cada una cuesta ~$38.000, ida y vuelta; ~$77.000 cubren dos), 2) muestra del producto (~$83.000 con flete), 3) dominio, 4) modelo de IA con facturación, 5) servidor, 6) anuncios.
- **Reglas:** nada que el proveedor no respalde (AGENTS.md §6 y §9); sin muestra no se afirman datos medidos (nada de "48V"); fotos y videos del proveedor solo si son reales (ni capturas de otros vendedores ni imágenes de IA); precios y márgenes salen de `tienda/scripts/economia.mjs`.

## 3. Producto
Reevaluado el 4-oct-2026 con fletes reales de Dropi (7 ciudades, con recaudo, transportadora más barata) y precios de MercadoLibre:

| Producto (ID Dropi) | Costo | Mercado | Flete prom. | Margen | Veredicto |
|---|---|---|---|---|---|
| Set de herramientas 46 pzs (964437) | $24.000 | genérico igual: **$17.000–50.000**; con marca en Homecenter: $69.900–179.900 | $17.400 | ≈ $0 a precio de mercado ($39.900) | **Descartado**: el costo casi iguala el precio de mercado |
| Mini pulidora 3" (2250558) | $48.000 | $65.800–114.900 | $17.900 | $29.700 a $99.900 · $38.900 a $109.900 | **Débil**: CPA máximo de $11.500–18.200; la foto del proveedor parece un render |
| Sopladora doble batería (1917934) | $64.000 | genéricos ~$97.700–126.000; $178.900 o más los de más potencia o de marca | $19.200 | $41.200 a $129.900 · **$50.300 a $139.900** · ~$70.000 con 2 unidades a $229.900 | **Posible solo si el mercado acepta ≥ $130.000–140.000** |

- El precio "sugerido" de Dropi no sirve como referencia: hay sugeridos de $200.000 para costos de $24.000.
- Casi todo genérico del catálogo queda con margen de $20.000–40.000 por entrega a precio de mercado. Por eso un margen de ~$50.000 es la barrera para pagar anuncios más adelante.
- **Cómo buscar mejores:** (1) el dueño mira en su panel de Dropi si hay un ranking de más vendidos o de tendencia y pasa 10 nombres, porque el conector del catálogo no entrega demanda; (2) Claude comprueba costo, flete real y precio de MercadoLibre; (3) solo pasa un producto con margen ≥ $45.000 a precio de mercado, sin marcas de terceros y con fotos reales.
- **La sopladora se valida con contenido, no con muestra:** se publica con el precio objetivo y se cuentan las conversaciones serias antes de comprar nada (§6). Si el mercado no acepta ese precio, se cambia de producto.

## 4. Qué corre gratis y qué cuesta

| Pieza | Opción gratis o casi | Cuándo y qué pagar |
|---|---|---|
| Atender clientes | App **WhatsApp Business** en el celular de la tienda: perfil, catálogo y respuestas rápidas | El bot por API entra cuando haya ventas |
| WhatsApp por API (YCloud + Meta) | Plan gratis de YCloud (según el ROADMAP; **por confirmar**). Desde el 1-oct-2026 Meta cobra las respuestas dentro de las 24 h; en Colombia ≈ USD 0,0008 por mensaje de servicio, con 1.000 mensajes de servicio gratis al mes por número (**por confirmar**) | Casi $0 al inicio. Las plantillas de marketing cuestan ≈ USD 0,0125 |
| Servidor | Tu PC con Docker Desktop corriendo `infra/docker-compose.yml` (n8n + Postgres), encendido en horario de ventas y sin suspensión | Un VPS de 2 vCPU y 4 GB cuando el PC estorbe (por cotizar; según el proveedor, de unos USD 5 a 25 al mes) |
| URL pública para el webhook | El túnel rápido de Cloudflare (`cloudflared-quick` en `infra/`) es gratis, pero **la URL cambia en cada reinicio** y Cloudflare lo documenta como no apto para producción. ngrok gratis da 1 dominio fijo (1 GB al mes; **por verificar** al instalar) | Dominio propio (unos USD 12–20 al año, por cotizar) + túnel con nombre de Cloudflare (gratis): URL fija y sirve para la verificación de Meta |
| Modelo de IA | Gemini **Flash** en el nivel gratis. El Pro dejó de ser gratis el 1-abr-2026 (según terceros) y el reporte de OT-04 dice que el agente usó `gemini-pro-latest` | **Solo con datos falsos:** en el nivel gratis Google puede usar y revisar por personas lo que se envía, y pide no mandar datos personales. Con clientes reales hay que activar facturación (en el nivel de pago no se entrena con tus datos); el costo por conversación debería ser de centavos de dólar (**por medir**) |
| Verificación del negocio en Meta | No hace falta para empezar: sin verificar se puede escribir a 250 clientes distintos por día; la verificación sube ese tope | Cuando haya dominio |
| Shopify | Ya se paga el plan Basic: **revisar cuánto y cuándo se renueva**, es el gasto fijo más alto | Si el dinero aprieta, vender primero por WhatsApp y crear los pedidos en Dropi a mano (§5) |
| Dropi | Registro gratis; el recaudo llega a la billetera después de la entrega. **Confirmar pedidos con recaudo no exige saldo** (confirmado por el dueño en su cuenta) | Una devolución se cobra **ida y vuelta** (confirmado por el dueño): ~$38.000 con los fletes cotizados, y sale de la billetera. **Por confirmar:** qué pasa si la billetera está en $0 cuando llega una devolución (saldo negativo, bloqueo de pedidos nuevos o descuento de las próximas ganancias) |

## 5. Primeros pedidos sin anuncios
1. **Canal base:** el número de WhatsApp de la tienda en la app WhatsApp Business. Respuestas rápidas con el guion de [prompts/agente_ventas_system.md](../prompts/agente_ventas_system.md) y las objeciones de la ficha.
2. **Enlaces con código de canal:** `https://wa.me/<número>?text=Hola%2C%20quiero%20la%20sopladora%20(tt-93)` con `tt` (TikTok), `ig`, `fb`, `st` (estado de WhatsApp) o `gr` (grupos). Hoy DS-01 solo reconoce `(web-…)`; mientras tanto, el dueño anota el canal a mano (la §7 propone arreglarlo).
3. **Contenido:**
   - Pedir al proveedor fotos y videos reales del producto, y revisar cada uno: sin marcas de terceros, sin capturas de otros vendedores y sin imágenes de IA.
   - Videos cortos (15 a 30 s) del producto en uso, con el precio y el pago contra entrega a la vista. Nada de urgencia falsa ni de datos que el proveedor no respalde.
   - Dónde: TikTok, Reels y Shorts (una pieza al día), grupos de Facebook y Marketplace de la ciudad, estados de WhatsApp y el Instagram de la tienda con el enlace al WhatsApp. Es trabajo del dueño: calcula 1 a 2 horas al día.
4. **Atender:** responder en minutos. Antes de crear el pedido, pedir nombre, apellido, celular de 10 dígitos que empiece por 3, ciudad con cobertura, dirección y barrio, y repetir el resumen con el precio total (la misma regla que seguirá el bot).
5. **Crear el pedido:** en el panel de Dropi (por confirmar el flujo exacto) o, cuando se automatice, por Shopify con el formato validado en OT-06. Los pedidos de prueba llevan siempre el tag `TEST` y se cancelan antes del despacho.
6. **Confirmar y seguir:** confirmar la orden en Dropi (entra como PENDIENTE CONFIRMACION), revisar guías y novedades cada día y avisar al cliente por WhatsApp.
7. **Registro:** una hoja con fecha, canal, conversaciones, pedidos, entregados, devueltos y ganancia.

## 6. Etapas y semáforo
- **Etapa 0 (días 1 a 7, costo $0):** elegir producto (§3), pedir material al proveedor, dejar WhatsApp Business listo, publicar las primeras 5 piezas, averiguar lo que está "por confirmar" (§8).
- **Etapa 1 (días 8 a 30):** atender y crear pedidos a mano, y medir. Mientras la billetera de Dropi esté en $0, el dueño fija un **tope de pedidos en tránsito**: lo máximo que puede perder es ~$38.000 por cada pedido que se devuelva (con un tope de 3 pedidos, ~$115.000 en el peor caso).
- **Semáforo a los 14 días y con al menos 15 publicaciones** (umbrales sugeridos, se ajustan con datos): **verde** si hay 10 o más conversaciones con el precio visible y 2 o más pedidos; **amarillo** con 5 a 9 conversaciones (cambiar el gancho del video o el precio); **rojo** con menos de 5 (cambiar de producto o de canal).
- **Etapa 2 (primeros ingresos):** reinvertir en el orden de la §2 y conectar YCloud en coexistencia para probar el bot con datos falsos.
- **Etapa 3 (20 o más pedidos al mes, o más de 2 horas diarias atendiendo):** bot en producción, dominio, servidor y el primer presupuesto de anuncios.

## 7. Para el Frente B (propuestas, aún no son OT)
1. **DS-01:** reconocer `(ig-…)`, `(tt-…)`, `(fb-…)`, `(st-…)` y `(gr-…)` además de `(web-…)`, y guardar canal y SKU. Hoy `workflows/generate_workflows.mjs` solo detecta `(web-…)`, y todo lo demás queda como `organico` sin producto.
2. **Modelo de IA configurable** con `LLM_MODEL_AGENTE` (por defecto un Flash), pruebas con conversaciones falsas y sin datos personales mientras sea el nivel gratis.
3. **Instructivo de arranque en Windows** (Docker Desktop, túnel con nombre o ngrok, reinicio automático) y una comprobación de que n8n responde.
4. **Pendientes que dependen de Dropi:** confirmación automática de pedidos y lectura de stock (API solicitada el 2-oct-2026).

## 8. Preguntas abiertas
- **Dropi** (en el correo ya enviado a Marcos, o por soporte): si llega una devolución y la billetera está en $0, ¿qué pasa con el cobro: queda saldo negativo, bloquean los pedidos nuevos o lo descuentan de las próximas ganancias? ¿En cuánto tiempo llega el recaudo? ¿Hay descuento en muestras? ¿Hay casos en que no cobran la vuelta de una devolución?
- **YCloud:** ¿plan gratis, cobro por mensaje y qué exige de verificación para la coexistencia?
- **Shopify:** fecha de renovación y monto del plan Basic.

## Fuentes
- WhatsApp: [precios 2025-2026 (CM.com)](https://www.cm.com/blog/whatsapp-business-platform-pricing/), [cambios del 1-oct-2026 (Courier)](https://www.courier.com/blog/whatsapp-pricing-changes-october-2026), [límites sin verificación (Wassenger)](https://wassenger.com/blog/en/whatsapp-business-api-without-verification)
- Gemini: [límites del nivel gratis](https://tinkerllm.com/blog/gemini-api-free-tier-limits-rate-quotas/), [uso de datos en el nivel gratis](https://ampm-aiops.com/en/guides/gemini-free-tier-data-tradeoff-2026/)
- Túneles: [ngrok, límites del plan gratis](https://ngrok.com/docs/pricing-limits/free-plan-limits), [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/)
- Dropi: [cómo funciona paso a paso (Andrey Business)](https://www.andreybusiness.com/blog/como-funciona-dropi-paso-a-paso-2026)- Precios de mercado: [sopladoras](https://listado.mercadolibre.com.co/pistola-sopladora-aspiradora), [pulidoras](https://listado.mercadolibre.com.co/mini-pulidora-inalambrica), [sets de dados](https://listado.mercadolibre.com.co/juego-de-dados), [Homecenter: ratchet 46 piezas](https://www.homecenter.com.co/homecenter-co/k/rachet)
