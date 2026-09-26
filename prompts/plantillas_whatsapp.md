# Plantillas de WhatsApp (para aprobación de Meta)

**Cuándo se usan:** solo para escribirle al cliente **fuera de la ventana de 24 h** desde su último mensaje. Dentro de la ventana, el agente usa texto libre (la confirmación del pedido, por ejemplo, **no** necesita plantilla).

**Dónde se crean:** WhatsApp Manager → Plantillas de mensajes. Idioma: **Spanish (`es`)**. El `name` y el `language.code` deben coincidir exactamente con lo que envía DS-03 (ver [salida_whatsapp.example.json](../schemas/salida_whatsapp.example.json)).

**Reglas para que las aprueben:**
- El cuerpo **no puede empezar ni terminar con una variable** `{{n}}`.
- Poca proporción de variables frente a texto fijo; da **valores de ejemplo** realistas para cada una.
- Nada promocional en las plantillas de utilidad: si Meta detecta venta, la reclasifica como *Marketing* (más cara).
- Meta decide la categoría final; revisa cómo quedó clasificada cada una.

---

### 1. `pedido_despachado` — Utilidad
```
Hola {{1}}, tu pedido {{2}} ya va en camino 🚚
Transportadora: {{3}}
Número de guía: {{4}}
Te avisaremos cuando salga a reparto. Recuerda tener el dinero listo para pagar al recibir.
```
Ejemplos: `Laura` · `#1023` · `Interrapidísimo` · `240012345678`
Disparador: DS-10 recibe `fulfillments/create` con guía.

### 2. `pedido_en_reparto` — Utilidad
```
Hola {{1}}, tu pedido {{2}} sale hoy a reparto.
Por favor mantén tu celular disponible y ten listo el valor de {{3}} para pagar al mensajero.
Si no vas a estar, responde a este mensaje y lo reprogramamos.
```
Ejemplos: `Laura` · `#1023` · `$129.900`
Disparador: `shipment_status = out_for_delivery` o estado "en reparto" de Dropi.

### 3. `novedad_entrega` — Utilidad
```
Hola {{1}}, la transportadora reporta una novedad con tu pedido {{2}}: {{3}}.
Para que tu pedido no sea devuelto, responde a este mensaje y te ayudamos a coordinar la entrega.
```
Ejemplos: `Laura` · `#1023` · `dirección incompleta`
Botón de respuesta rápida (opcional): `Reprogramar entrega`
Disparador: novedad en Dropi. **También alerta al operador por Telegram.**

### 4. `solicitud_resena` — probablemente Marketing
```
Hola {{1}}, esperamos que ya estés disfrutando tu {{2}}.
¿Cómo te fue? Respóndenos con una calificación del 1 al 5; tu opinión nos ayuda a mejorar.
```
Ejemplos: `Laura` · `Producto Estrella`
Disparador: pedido entregado + 3 días.

### 5. `retomar_conversacion` — Utilidad
```
Hola {{1}}, te escribimos de [[MARCA]] para dar respuesta a tu consulta sobre {{2}}.
Responde a este mensaje para continuar la conversación.
```
Ejemplos: `Laura` · `tu pedido #1023`
Uso: el operador humano necesita retomar una conversación escalada después de 24 h (DS-04).

### 6. `primer_contacto_lead` — Marketing (solo si activas Lead Ads; backlog)
```
Hola {{1}}, gracias por tu interés en [[PRODUCTO]].
Soy [[NOMBRE_ASESOR]] de [[MARCA]] y por aquí te resuelvo cualquier duda. ¿Para qué te gustaría usarlo?
```
Ejemplo: `Laura`
