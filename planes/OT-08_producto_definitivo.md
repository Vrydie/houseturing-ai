# OT-08 — Cambiar la tienda al producto definitivo

**Estado:** borrador (espera P0 del dueño) · **Frente:** A · **Responsable:** dueño · **Ejecuta:** Antigravity · **Planifica:** Claude
**Prioridad:** alta. Sin producto definitivo no hay fotos, ficha, anuncios ni lanzamiento.
**Depende de:** OT-02 (plantilla guiada por datos), OT-06 (formato de pedido validado) y la elección del producto (ver abajo).

**Lecturas obligatorias:** [AGENTS.md](../AGENTS.md) (§4 bis simular antes de ejecutar, §6 Shopify, §8 marcas, §9 calidad visual) y [OT-02](OT-02_tienda_shopify.md) (cómo está construida la plantilla).

---

## Producto candidato (Claude, 3-oct-2026)
Elegido con el conector MCP de Dropi (solo lectura), la calculadora `tienda/scripts/economia.mjs` y la comparación con precios de Colombia:

| | Sopladora inalámbrica doble batería |
|---|---|
| ID Dropi | 1917934 |
| Precio proveedor | $64.000 |
| Precio de venta propuesto | **$159.900** (competencia en MercadoLibre, Homecenter y Falabella: $178.900 a $305.000) |
| Flete promedio con recaudo (Bogotá, Medellín, Barranquilla, Cali) | ~$16.365 |
| Margen por entrega | ~$72.200 |
| CPA máximo con 75 % de efectividad | ~$44.000 |

Segunda opción si la sopladora no pasa P0: deshumidificador absorbente (ID 330852) a $179.900 como máximo (margen ~$58.600, CPA máximo ~$30.400; flete alto y efecto poco visible en video).

## P0 — Precondiciones del dueño (bloqueantes)
- [ ] **Fotos del producto en Dropi sin marcas de terceros** (logos, nombres, colores que imiten Makita, DeWALT, etc.). Si hay marcas, se descarta (AGENTS.md §8) y se pasa a la segunda opción.
- [ ] **Muestra física recibida** (pedido normal en Dropi, pagado por el dueño). Con ella el dueño:
  - prueba la calidad y la autonomía de la batería (anota cuántos minutos dura);
  - graba **fotos y videos propios** (sin IA ni ediciones que cambien el producto);
  - anota exactamente qué trae la caja.
- [ ] **Precio final aprobado** (propuesto: $159.900) y oferta x2, si la habrá.
- [ ] Producto **importado con Dropify** a Shopify (mismo SKU que en Dropi). No se crea por API (AGENTS.md §6).

## Pasos (Antigravity, cuando P0 esté completo)
1. **Ficha nueva:** `prompts/base_conocimiento_producto.md` con los datos de la muestra y de la ficha de Dropi. Ningún dato que el dueño no haya verificado (potencia, autonomía, velocidad): si no se verificó, no va. Antes de reemplazar la ficha del taladro, guárdala en `prompts/archivo/base_conocimiento_taladro_ejemplo.md`. Mínimo 15 objeciones (§9) y la lista de lo que el agente nunca debe decir (§11).
2. **Calculadora:** `node tienda/scripts/economia.mjs` con el precio final y los fletes reales; pega la salida en el reporte. Si el CPA máximo al 75 % baja de $25.000, detente.
3. **Metafields `landing.*`, SEO y galería** del producto nuevo, desde la ficha. Script en `tienda/scripts/`, con simulación por defecto, `--aplicar`, respaldo e idempotencia (AGENTS.md §4 bis). Asigna la plantilla `estrella` al producto nuevo.
4. **Tema:** solo lo que dependa del producto y no de datos (por ejemplo, el número de "cifras" del hero o los modos de uso). Sin textos escritos a mano en el Liquid. Mismo tema de trabajo (`tienda/theme/THEME_ID`), sin publicar.
5. **Taladro de ejemplo:** quitarle la plantilla `estrella` y **archivarlo** en Shopify (no borrarlo), con simulación previa.
6. **Enlace de WhatsApp:** el sufijo `(web-<SKU nuevo>)` y el texto prellenado sin mencionar el taladro.
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
