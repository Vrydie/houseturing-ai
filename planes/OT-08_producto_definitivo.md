# OT-08 — Cambiar la tienda al producto definitivo

**Estado:** borrador (espera P0 del dueño) · **Frente:** A · **Responsable:** dueño · **Ejecuta:** Antigravity · **Planifica:** Claude
**Prioridad:** alta. Sin producto definitivo no hay fotos, ficha, anuncios ni lanzamiento.
**Depende de:** OT-02 (plantilla guiada por datos), OT-06 (formato de pedido validado) y la elección del producto (ver abajo).

**Lecturas obligatorias:** [AGENTS.md](../AGENTS.md) (§4 bis simular antes de ejecutar, §6 Shopify, §8 marcas, §9 calidad visual) y [OT-02](OT-02_tienda_shopify.md) (cómo está construida la plantilla).

---

## Producto candidato (Claude, 3-oct-2026; corregido el 4-oct-2026)
Elegido con el conector MCP de Dropi (solo lectura), la calculadora [`tienda/scripts/economia.mjs`](../tienda/scripts/economia.mjs) y precios de Colombia.

| Dato de Dropi (consulta directa, 4-oct-2026) | |
|---|---|
| Producto | Pistola Máquina Sopladora Doble Batería · ID **1917934** · SKU de Dropi **93** |
| Proveedor / bodega | 36223 · bodega en Bogotá (según una cotización del conector; por confirmar con el proveedor) |
| Precio proveedor / sugerido por Dropi | $64.000 / **$100.000** |
| Stock en Dropi | 205 |
| Categorías / tipo | Hogar, Aseo, Herramientas · SIMPLE (sin variaciones) |
| Galería | **1 sola foto** |
| Flete con recaudo, 1 unidad (Bogotá $13.450 · Medellín $16.450 · Cali $16.450 · Barranquilla $19.110) | promedio **~$16.365** |

El flete se cotizó con un valor declarado de $100.000. Con un precio de venta más alto puede subir entre $500 y $1.500 (por confirmar con una cotización al precio final).

### Corrección del 4-oct-2026: el precio de venta NO está definido
La primera versión de esta OT proponía vender a **$159.900** porque las sopladoras que se habían buscado costaban entre $178.900 y $305.000. Una segunda búsqueda en MercadoLibre Colombia muestra **equivalentes genéricos mucho más baratos**, con envío gratis y cuotas:
- "Pistola sopladora aspiradora 6 velocidades": ~$97.700 (con 22 % de descuento sobre $125.900).
- "Soplador turbina inalámbrico 2 baterías 48 V": ~$110.200 (con 42 % de descuento sobre $190.000).
- Dropi sugiere $100.000.

A $159.900 seríamos **más caros que el equivalente genérico**. Los $178.900 o más que se vieron antes corresponden a modelos de más potencia o de marca.

| Precio de venta | Margen por entrega | CPA máximo con 70 % / 75 % de entrega |
|---|---|---|
| $109.900 | $24.500 | $5.300 / $8.200 |
| $119.900 | $34.000 | $12.000 / $15.300 |
| $129.900 | $43.600 | $18.700 / $22.500 |
| $139.900 | $53.100 | $25.400 / $29.600 |
| $149.900 | $62.600 | $32.000 / $36.800 |
| $159.900 | $72.200 | $38.700 / $44.000 |

Proveedor $64.000, flete $16.365 y comisión de Dropi 4,5987 % (la del pedido de OT-06). Salida de `node tienda/scripts/economia.mjs --precio <precio> --proveedor 64000 --flete 16365`.

- Para un CPA de $25.000 al 75 % hace falta vender a **$133.400 o más**. Ese CPA objetivo es un **supuesto**, no un dato medido: se ajusta con el costo real de las conversaciones al lanzar.
- **Palanca: oferta x2.** A $229.900 por las dos unidades, el margen por pedido sería de ~$71.000 (con un flete de 2 unidades **supuesto** de $20.365, por cotizar). Sube lo que se gana por cada pedido que traen los anuncios.
- Si el precio que el mercado acepta queda por debajo de ~$130.000, la sopladora no sirve y se pasa a otro candidato.

Otra opción: deshumidificador absorbente (ID 330852). Los de 500 ml se ven en MercadoLibre desde ~$99.800 hasta $180.000, con envío gratis, así que $179.900 queda en el tope del mercado; además, el flete es alto (~$23.100, bodega en Antioquia) y el efecto es poco visible en video.

## Revisión de la foto de Dropi (Claude, 4-oct-2026)
La galería tiene **una sola foto** (1080 × 1080): una sopladora negra con **bolsa de aspirado**, boquilla, **2 baterías rotuladas "48V LITHIUM-ION"**, cargador con enchufe de 2 patas planas y un adaptador. **No se ven logos ni nombres de terceros.**
- El nombre del archivo dice "aspirador nasal": está mal nombrado por el proveedor. La imagen es de la sopladora.
- **"48V" es lo que dice el rótulo de la batería, no un dato verificado.** No se afirma en la tienda, la ficha ni los anuncios hasta medirlo (ver P0). Es el mismo problema que tuvo el taladro de ejemplo.
- Que "sopla y aspira" sale de la foto, no de una descripción del proveedor: se confirma con la muestra.
- El conector de Dropi no entrega descripción, especificaciones, peso, medidas ni garantía. Esos datos salen de la muestra y de preguntarle al proveedor.
- La foto del proveedor es solo referencia: la tienda y los anuncios usan **fotos y videos propios de la muestra**.

## P0 — Precondiciones del dueño (bloqueantes)
- [x] **Foto de Dropi sin marcas de terceros** (revisada por Claude el 4-oct-2026). Falta confirmarlo en la muestra: logos en el cuerpo, las baterías, el cargador, la caja y el manual. Si hay marcas de terceros, se descarta (AGENTS.md §8) y se pasa a otro candidato.
- [ ] **Muestra física recibida** (pedido normal en Dropi, pagado por el dueño).
- [ ] **Verificación de la muestra**, anotada en `planes/evidencia/OT-08/muestra.md`. Solo valores **medidos**; lo que no se mida, no va en la ficha:
  1. **Voltaje real** de cada batería con un multímetro, al 100 % de carga. El rótulo dice "48V" y las baterías de este tipo suelen medir mucho menos. La ficha usa el valor medido.
  2. **Rótulos:** capacidad (Ah o Wh) de las baterías y entrada/salida del cargador. Foto de cada etiqueta.
  3. **Autonomía:** minutos de uso continuo con la batería llena, a velocidad máxima y a mínima. Tiempo de carga. Con cronómetro.
  4. **Potencia y velocidades:** lo que diga la etiqueta del equipo (W, número de velocidades). Si no lo dice, no se afirma.
  5. **Peso y medidas**, con y sin batería (báscula y cinta métrica).
  6. **Contenido exacto de la caja:** foto con todo desplegado.
  7. **Sopla y aspira:** probar los dos modos con la bolsa (hojas secas, polvo, teclado, interior del carro) y anotar qué funciona y qué no.
  8. **Ruido, vibración y calentamiento** tras 5 minutos de uso, descritos con honestidad y sin cifras inventadas.
  9. **Marcas y logos** en el cuerpo, las baterías, el cargador, la caja y el manual. Foto de cada uno.
  10. **Garantía del proveedor 36223:** preguntarla por Dropi (plazo y cómo se reclama) y anotar la respuesta. Sin garantía del proveedor, la ficha no promete garantía.
- [ ] **Precio final aprobado por el dueño** con la calculadora y la evidencia de precios de arriba (gate: CPA máximo al 75 % ≥ $25.000 con 1 unidad), y decisión sobre la oferta x2.
- [ ] **Cotización de fletes al precio final** (Bogotá, Medellín, Cali, Barranquilla y al menos 2 ciudades intermedias).
- [ ] Producto **importado con Dropify** a Shopify (mismo SKU que en Dropi). No se crea por API (AGENTS.md §6).

## Pasos (Antigravity, cuando P0 esté completo)
1. **Ficha nueva:** `prompts/base_conocimiento_producto.md` con los datos de `planes/evidencia/OT-08/muestra.md` y de la ficha de Dropi. Ningún dato que el dueño no haya verificado (potencia, autonomía, velocidad, voltaje): si no se midió, no va. Antes de reemplazar la ficha del taladro, guárdala en `prompts/archivo/base_conocimiento_taladro_ejemplo.md`. Mínimo 15 objeciones (§9) y la lista de lo que el agente nunca debe decir (§11).
2. **Calculadora:** `node tienda/scripts/economia.mjs` con el precio final y los fletes reales; pega la salida en el reporte. Si el CPA máximo al 75 % baja de $25.000, detente.
3. **Metafields `landing.*`, SEO y galería** del producto nuevo, desde la ficha. Script en `tienda/scripts/`, con simulación por defecto, `--aplicar`, respaldo e idempotencia (AGENTS.md §4 bis). Asigna la plantilla `estrella` al producto nuevo.
4. **Tema:** solo lo que dependa del producto y no de datos (por ejemplo, el número de "cifras" del hero o los modos de uso). Sin textos escritos a mano en el Liquid. Mismo tema de trabajo (`tienda/theme/THEME_ID`), sin publicar.
5. **Taladro de ejemplo:** quitarle la plantilla `estrella` y **archivarlo** en Shopify (no borrarlo), con simulación previa.
6. **Enlace de WhatsApp:** el sufijo `(web-<SKU nuevo>)` (el SKU de Dropi es **93**, un número corto: comprobar que DS-01 lo interpreta bien) y el texto prellenado sin mencionar el taladro.
7. **Capturas** a 390 y 1440 px de cada sección para la revisión de diseño. Lighthouse real o `NO MEDIDO`.
8. **Para el Frente B** (en el reporte, no lo hace Antigravity): SKU, variant GID y ofertas nuevas para la semilla de `productos` y `ofertas` (OT-07).

## Prohibido en esta OT
Publicar el tema, quitar la contraseña de la tienda, crear pedidos, usar imágenes del producto generadas o alteradas con IA y escribir afirmaciones que no estén en la ficha verificada.

## Criterios de aceptación
- [ ] Ficha nueva verificada por el dueño, con el taladro archivado en `prompts/archivo/`.
- [ ] Vista previa del tema con el producto nuevo, fotos reales y precio = variante = oferta x1.
- [ ] Taladro archivado en Shopify y sin plantilla `estrella`.
- [ ] Salida de la calculadora con el precio final; CPA máximo al 75 % ≥ $25.000.
- [ ] Capturas para la revisión de diseño de Claude y del dueño.

## Reporte de ejecución (lo llena Antigravity)
- Estado final:
- Qué se hizo:
- Evidencia:
- Qué NO se probó:
- Desvíos del plan y por qué:
- Decisiones que necesito del dueño o de Claude:
