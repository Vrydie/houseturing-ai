# Módulo P — Motor de selección de productos estrella

> Parte del [ROADMAP](ROADMAP.md). Corre en la instancia n8n del proyecto (`infra/`) y guarda todo en la BD `dropship`. No toca nada fuera de esta carpeta.

## 1. Qué se automatiza y qué no

**Ningún sistema predice un producto ganador con certeza: quien decide es la prueba con anuncios.** El valor de este motor está en **probar más productos, más rápido y más barato, y cortar los perdedores con datos**, sin apegarse emocionalmente a ninguno.

| # | Etapa | Nivel de automatización | Quién |
|---|---|---|---|
| 1 | Descubrir candidatos en el catálogo de Dropi | Total | n8n (API Dropi) |
| 2 | Medir la demanda (rotación de stock en Dropi, MercadoLibre) | Total | n8n |
| 3 | Filtrar por margen, stock, proveedor y categorías prohibidas | Total | n8n (SQL) |
| 4 | **Comparar con el mercado según la categoría:** Éxito, Falabella, Temu, AliExpress, Shein | Casi total | n8n + LLM emparejador. **Tú:** Temu y Shein a mano sobre la shortlist (no tienen API) |
| 5 | Evaluar el potencial (problema, efecto *wow*, riesgos, políticas) con el comparativo incluido | Total | LLM |
| 6 | Armar la shortlist semanal con puntaje | Total | n8n → Telegram |
| 7 | Revisar la competencia en la Biblioteca de anuncios de Meta | **Manual**, ~15 min/semana | Tú. La API de Meta no entrega anuncios comerciales de Colombia (solo de la UE y el Reino Unido) |
| 8 | Aprobar qué producto se prueba | **Manual**, 1 clic en Telegram | Tú |
| 9 | Preparar el lanzamiento: precios, borrador de ficha, guiones de video, campaña en pausa | Casi total | n8n + LLM. **Tú:** importar con Dropify, grabar/subir creativos, revisar la ficha |
| 10 | Juzgar la prueba: matar o marcar ganador | **Matar: automático.** Escalar lo decides tú | n8n |
| 11 | Aprender de los resultados | Semi (ajuste mensual de pesos) | Tú + datos |

Resultado: de ~160.000 productos en Dropi llegan **10 candidatos por semana**, con los datos listos para decidir en minutos. Cada prueba se corta sola si no funciona.

---

## 2. Fuentes de datos

| Fuente | Qué aporta | Acceso | Estado |
|---|---|---|---|
| **API de integraciones de Dropi** | Catálogo, precio proveedor y sugerido, stock, bodega, proveedor; **cotizador de flete**; ciudades | `dropi-integration-key` (solicitada en F0.3) | Su documentación incluye "Consulta de productos", "Cotizador de flete" y "Listar ciudades". Confirma los campos cuando Dropi te la entregue |
| **Rotación de stock** (derivada) | Unidades vendidas por **toda la red de dropshippers**: caída diaria del stock del proveedor | Snapshots diarios propios | Es la misma señal que usan herramientas pagas de ranking de Dropi |
| **MercadoLibre Colombia** (MCO) | "Más vendidos" por categoría (`/highlights`), rango de precios de la competencia | App gratuita en developers.mercadolibre + OAuth | Opcional pero recomendado |
| **Tiendas locales:** Éxito, Falabella (y Alkosto, Homecenter, MercadoLibre vía Google Shopping CO) | ¿Se consigue en Colombia, en tienda física, y a qué precio? | Éxito: búsqueda pública de su catálogo. Resto: Google Shopping Colombia vía SerpApi | Ver [DS-48](#ds-48--comparador-de-mercado-éxito-falabella-temu-aliexpress-shein) |
| **Tiendas internacionales:** Temu, AliExpress, Shein | Precio piso que el cliente puede encontrar; demanda global (AliExpress) | AliExpress: API oficial de afiliados. Temu y Shein: sin API (revisión manual con enlace) | Ver DS-48 |
| Google Trends | Interés de búsqueda en Colombia | API oficial en alfa cerrada (hay que aplicar); alternativa paga: SerpApi | Opcional |
| Biblioteca de anuncios de Meta | Quién lo vende y cuánto tiempo llevan activos sus anuncios (anuncio de muchas semanas = rentable) | **Solo web** | Manual, solo sobre la shortlist (el mensaje trae el enlace de búsqueda listo) |
| TikTok Creative Center | Productos y hashtags en tendencia | Sin API | Manual, opcional |
| Dropdata (tercero, pago) | Ranking diario de ventas en Dropi | Sin API publicada | Consulta manual opcional para contrastar |

> ⚠️ **No hacer scraping del panel de Dropi con tu cuenta.** Arriesgas el bloqueo de la misma cuenta con la que despachas. Solo API oficial.

---

## 3. Pipeline en n8n

| ID | Workflow | Trigger | Qué hace |
|---|---|---|---|
| DS-40 | Ingesta del catálogo Dropi | Diario 3:00 | Pagina la consulta de productos (solo categorías objetivo y proveedores verificados, para no traer 160 mil ítems), hace upsert en `catalogo_dropi` y guarda el snapshot del día en `catalogo_snapshots` |
| DS-41 | Señales de demanda | Diario 4:00 | Calcula ventas estimadas, aceleración, días de stock, flete y margen; los lunes consulta MercadoLibre para el top 50 |
| DS-42 | Filtros duros | Diario 4:30 | Marca `pasa_filtros` o el `motivo_descarte` |
| DS-48 | Comparador de mercado | Diario 4:45 + lunes 6:30 (reverificación) | Busca el producto en las tiendas de su categoría, empareja resultados con IA y calcula el puntaje de `mercado` y el filtro de "más barato en tienda local" |
| DS-43 | Evaluación IA | Diario 5:00 | Evalúa con el LLM, **incluyendo el comparativo de DS-48**, solo los candidatos nuevos o con cambios fuertes que pasaron filtros (máx. 30/día para controlar el costo) |
| DS-44 | Score y shortlist | Lunes 7:00 | Calcula el score, arma el top 10 y lo envía a Telegram con botones |
| DS-45 | Preparar lanzamiento | Botón "✅ Probar" | Producto, ofertas, borrador de ficha, guiones de video, campaña en pausa y checklist manual |
| DS-46 | Juez de pruebas | Cada 6 h | Aplica las reglas de matar o ganador, diagnostica creativo vs. producto y resume objeciones |
| DS-47 | Aprendizaje | Mensual | Compara el score predicho con el resultado real y propone nuevos pesos |

### DS-41 · Cómo se estima la demanda
```
ventas_dia(d)   = max(0, stock(d-1) − stock(d))          # las subidas son reposición: cuentan 0
                  descartar el día si la caída > 50 % del stock (ajuste manual del proveedor, no ventas)
ventas_7d       = Σ ventas_dia de los últimos 7 días
aceleracion     = ventas_7d / max(ventas_7d_de_la_semana_anterior, 1)
dias_de_stock   = stock_actual / max(ventas_7d / 7, 0.1)
precio_venta    = redondear_a_900( max(precio_sugerido_dropi, precio_proveedor × MULTIPLICADOR_PRECIO) )
margen_entrega  = precio_venta − precio_proveedor − flete_cotizado − comision_recaudo
utilidad_esper. = %efectividad × margen_entrega − (1 − %efectividad) × costo_devolucion   # fórmula de F0.2
```
> **Empieza los snapshots cuanto antes.** La señal de rotación necesita **al menos 14 días de historia**. DS-40 debería correr desde que llegue el acceso a la API, aunque el resto del módulo aún no exista.

### DS-42 · Filtros duros (todos configurables en la tabla `config`)
- `utilidad_esperada ≥ UTILIDAD_MIN` (con el flete real del cotizador de Dropi).
- `precio_venta` dentro del rango que funciona en contraentrega (`PRECIO_VENTA_MIN`–`PRECIO_VENTA_MAX`, p. ej. $49.900–$169.900).
- `stock ≥ STOCK_MIN` (p. ej. 200) y `dias_de_stock ≥ 14`: que no se agote justo cuando funcione.
- Proveedor verificado/premium.
- `ventas_7d ≥ VENTAS_7D_MIN`: tiene que haber demanda demostrada.
- **Categorías prohibidas:** medicamentos, suplementos y cosméticos sin registro INVIMA, productos con promesas de salud o de pérdida de peso, réplicas de marcas, armas y defensa personal, productos para adultos y electrónicos que requieren homologación. En general, todo lo que las políticas publicitarias de Meta restringen.

### DS-48 · Comparador de mercado (Éxito, Falabella, Temu, AliExpress, Shein)
Corre después de los filtros y antes de la evaluación IA, **solo para los candidatos que pasaron** (máx. `max_comparaciones_dia`, 40 por defecto). El resultado vale 14 días y se reverifica el lunes antes de armar la shortlist.

**1. Qué tiendas se consultan según la categoría** (tabla `fuentes_categoria`, editable):

| Categoría | Local: ¿se consigue en Colombia y a qué precio? | Internacional: precio piso y demanda global |
|---|---|---|
| Hogar y cocina | Éxito, Falabella, MercadoLibre | Temu, AliExpress |
| Tecnología y gadgets | Falabella, Éxito, Alkosto\*, MercadoLibre | Temu, AliExpress |
| Moda, bolsos, accesorios, joyería | Falabella, MercadoLibre | Shein, Temu, AliExpress |
| Belleza y cuidado personal | Éxito, Falabella | Shein, Temu |
| Mascotas | Éxito, MercadoLibre | Temu, AliExpress |
| Deporte y fitness | Falabella, Éxito, Decathlon\* | Temu, AliExpress |
| Bebés y juguetes | Éxito, Falabella | Temu, AliExpress |
| Herramientas y carro | Homecenter\*, Falabella, MercadoLibre | Temu, AliExpress |
| Categoría no mapeada | todas | todas |

\* Llegan a través de Google Shopping Colombia; no tienen integración propia.

**2. Cómo se consulta cada tienda:**

| Tienda | Vía | Automatización | Notas |
|---|---|---|---|
| **Éxito** | Búsqueda pública de su catálogo (VTEX): `GET https://www.exito.com/api/catalog_system/pub/products/search?ft=<kw>&_from=0&_to=9` | Total, gratis | Probada el 26-sep-2026: responde JSON con nombre, precio, stock y vendedor. `sellers[].sellerName` distingue "vendido por Éxito" (probablemente en tienda física) de un vendedor del marketplace (URL con `-mp`). No es una API documentada: puede cambiar. Máximo 1 petición por segundo |
| **Falabella** (y Alkosto, Homecenter, Decathlon, MercadoLibre) | Google Shopping Colombia vía SerpApi (`engine=google_shopping`, `gl=co`, `hl=es`) | Total, pago por búsqueda | Falabella no tiene API pública y su sitio bloquea bots. Google Shopping agrupa las tiendas colombianas en una sola consulta |
| **AliExpress** | API oficial de afiliados: `aliexpress.affiliate.product.query` con `keywords` y `ship_to_country=CO` | Total, gratis | Requiere cuenta de afiliado. Devuelve precio y volumen de ventas reciente: sirve de precio piso **y** de señal de demanda global |
| **Temu** | Sin API. Si aparece en Google Shopping, se usa ese dato; si no, va un enlace de búsqueda en el mensaje de Telegram | Manual sobre la shortlist (~1 min por producto) | Hacerle scraping viola sus términos y sus defensas anti-bot lo rompen a menudo |
| **Shein** | Igual que Temu | Manual sobre la shortlist | — |

> ⚖️ Existen servicios de terceros (p. ej. actores de Apify) que extraen datos de Temu, Shein y Falabella. Violan los términos de esas tiendas y se rompen a menudo, así que por defecto **no** se usan. Si decides usarlos, que sea solo sobre la shortlist y a bajo volumen.

**3. Emparejar el producto correcto.** Buscar "masajeador cervical" devuelve de todo; sin este paso, el comparativo no sirve.
1. Un LLM económico genera 2-3 keywords genéricas en español (y en inglés para AliExpress) a partir del nombre y la descripción.
2. Se consultan las tiendas de la categoría y se toman los 5 primeros resultados de cada una.
3. El **emparejador** ([prompts/emparejador_mercado.md](prompts/emparejador_mercado.md)) clasifica cada resultado como `igual`, `similar` o `distinto`. Funciona mejor con visión, porque compara las fotos. Solo cuentan `igual`, y `similar` con confianza alta.
4. Cada resultado queda en `comparativo_mercado` y el resumen en `candidatos`.

**4. Métricas:**
```
precio_intl_efectivo = precio + envío a CO + 19 % de IVA si la compra supera US$50   # regla vigente desde 1-ene-2026
ratio_local  = precio_venta / precio_local_min        # Éxito, Falabella, MercadoLibre, Google Shopping CO
ratio_intl   = precio_venta / precio_intl_efectivo_min # Temu, AliExpress, Shein

sub_local = 100 si no se consigue localmente
            si no: 100 con ratio_local ≤ 0,77 (lo local cuesta ≥ 30 % más) … 0 con ratio_local ≥ 1,1   (lineal)
sub_intl  = 80 si no se encontró (no se pudo verificar)
            si no: 100 con ratio_intl ≤ 2,5 … 0 con ratio_intl ≥ 6   (lineal)
mercado   = 0,6 · sub_local + 0,4 · sub_intl
```

**5. Cómo se interpreta:**
- **Si está en Éxito o Falabella, vendido por la tienda, a tu precio o menos, es casi letal:** el cliente lo compra en el centro comercial. Por eso es un filtro duro (`descartar_si_ratio_local_mayor_a`, por defecto 1,0).
- **Que esté más barato en Temu, Shein o AliExpress es normal y no lo descarta.** El cliente de contraentrega paga por pagar al recibir, recibir en 2-5 días (Temu tarda 2-4 semanas y Shein 8-12 días hábiles), no usar tarjeta, tener garantía local y que lo atiendan por WhatsApp. **Pero** si el precio internacional es una fracción mínima del tuyo, sube el riesgo de que el cliente lo descubra y **rechace el paquete**. Por eso el ratio también alimenta el `riesgo_devolucion` de la evaluación IA.
- **Mucho volumen de ventas en AliExpress** = demanda global probada. Es contexto para la IA y aparece en Telegram, pero no entra en la fórmula.
- **Los umbrales (0,77 / 1,1 / 2,5 / 6) son valores iniciales.** DS-47 los recalibra con los resultados reales de las pruebas.

### DS-43 · Evaluación con IA
- Prompt: [prompts/evaluador_productos.md](prompts/evaluador_productos.md).
- Salida: [schemas/interno_evaluacion_producto.schema.json](schemas/interno_evaluacion_producto.schema.json).
- Si el modelo tiene visión, envía también 1-2 imágenes del producto: mejora mucho el juicio del efecto *wow*.
- **El LLM solo califica criterios del 1 al 5; la aritmética la hace n8n.** El `puntaje_ia` (0-100) se calcula en un nodo Code con los pesos de `config`.

### DS-44 · Score final y shortlist
```
score = 0.30 · demanda  +  0.20 · margen  +  0.25 · puntaje_ia  +  0.10 · (100 − saturacion)  +  0.15 · mercado
```
- Cada componente va de 0 a 100 como **percentil** dentro de los candidatos de la semana, excepto `mercado`, que ya viene en escala 0-100 desde DS-48.
- `demanda` = percentil de `ventas_7d` × factor de aceleración (acotado entre 0,7 y 1,3).
- `saturacion` = cuántos proveedores de Dropi venden un producto casi igual (similitud del nombre) + si ya aparece en "más vendidos" de MercadoLibre a un precio mucho menor.
- Si un veredicto trae bandera roja, el candidato sale del top aunque tenga buen score.

**Mensaje de Telegram por candidato:** foto, precio proveedor → precio de venta, utilidad esperada, ventas 7d y aceleración, días de stock, puntaje IA con sus 3 razones principales, riesgos y el **comparativo de mercado** ("Éxito $89.900 vendido por Éxito · Falabella no · AliExpress $21.000 + IVA, 3.200 vendidos"). Trae enlaces a Dropi y a los productos encontrados, **búsquedas prearmadas en Temu y Shein** para revisarlas a mano (plantillas en `config`) y la **búsqueda en la Biblioteca de anuncios**:
`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=CO&search_type=keyword_unordered&q=<keyword>`
Botones: **✅ Probar · ❌ Descartar · ⏸ Luego**.

### DS-45 · Preparar lanzamiento (al pulsar ✅)
1. Crear el producto en `productos` (estado `preparando`) y las ofertas x1/x2 con la fórmula de precio. Calcular su `cpa_maximo`.
2. El LLM redacta el **borrador de la ficha** con [prompts/generador_ficha_producto.md](prompts/generador_ficha_producto.md) y **5 guiones/hooks de video** de 15-30 s. Todo queda en estado `borrador` y se envía a Telegram para revisión.
3. Checklist manual en Telegram:
   - Importar con Dropify (el SKU tiene que coincidir).
   - Grabar o conseguir los creativos y subirlos.
   - Revisar y aprobar la ficha (`/aprobar_ficha <sku>`).
4. Marketing API: crear la **campaña de prueba en PAUSA** a partir de una plantilla (Click-to-WhatsApp, presupuesto de prueba, segmentación amplia en Colombia) y registrarla en `campanas` (campaign_id → sku). Tú subes los anuncios y la activas. *Si crear campañas CTWA por API se complica, duplica una plantilla en Ads Manager y registra el ID con `/campana <sku> <campaign_id>`.*
5. El producto pasa a `prueba` solo cuando la ficha está aprobada y la campaña activa.

### DS-46 · Juez de pruebas (reglas en `config`)
Datos: gasto por campaña (Insights API, `spend`), conversaciones y pedidos por SKU (BD).

| Regla | Condición | Acción |
|---|---|---|
| Matar por falta de ventas | gasto ≥ 1,5 × CPA_máx y 0 pedidos | Pausar la campaña, producto `descartado`, aviso a Telegram |
| Matar por costo | gasto ≥ 3 × CPA_máx y CPA > 1,5 × CPA_máx | Igual |
| Revisar el creativo, no el producto | costo por conversación > umbral tras 0,5 × CPA_máx de gasto | Aviso: "el anuncio no engancha, cambia el hook antes de matar el producto" |
| Revisar la oferta o la ficha | conversaciones OK pero cierre < 5 % | Aviso + resumen de las objeciones |
| Ganador | ≥ 5 pedidos con CPA ≤ CPA_máx | Producto `activo`, aviso "listo para escalar" (escalar lo decides tú) |
| Confirmación a 10-14 días | efectividad de entrega real | Confirmar el ganador o degradarlo |

**Ventaja exclusiva de este sistema:** el agente de WhatsApp guarda *por qué* la gente no compró. Cada semana, DS-46 le pide al LLM que resuma las **5 objeciones más frecuentes en las conversaciones perdidas** de cada producto en prueba. Eso separa un problema de producto de uno de precio, de ficha o de creativo, cosa que las herramientas de "productos ganadores" no pueden ver.

### DS-47 · Aprendizaje
- `pruebas_producto` guarda el score predicho frente al resultado real (ganador / descartado / no concluyente).
- Con **10 pruebas o más**, compara qué componentes del score predijeron mejor y ajusta los pesos en `config`.
- Los 2-3 ganadores y perdedores más claros se agregan como ejemplos en el prompt evaluador.

---

## 4. Cambios en el sistema de ventas: de 1 a N productos

- **Anuncio → producto:** `referral.source_id` (ad_id) → tabla `anuncios` (caché) → `campanas` → `sku`. Si el ad_id no está en caché, DS-01 consulta `GET /{ad_id}?fields=campaign_id` y lo guarda. El resultado queda en `conversaciones.sku`.
- **Ficha dinámica:** DS-02 inyecta `productos.base_conocimiento` del SKU de la conversación. Se mantiene la decisión D4 (sin RAG): cada conversación carga una sola ficha. Si la conversación es orgánica (sin anuncio), el agente pregunta cuál de los productos activos le interesa.
- **Herramientas:** `oferta_id` válido solo dentro del SKU de la conversación.
- **Guardián de stock (DS-21):** recorre todos los productos activos y pausa solo las campañas de cada SKU (según `campanas`).
- **Reporte diario (DS-30):** métricas por producto.

---

## 5. Orden de implementación

| Bloque | Workflows | Cuándo | Esfuerzo orientativo | Depende de |
|---|---|---|---|---|
| **P-A Datos** | DS-40, DS-41, DS-42 | En paralelo con F1-F4, **apenas haya acceso a la API de Dropi** | 3-4 días | F1 (infra), API Dropi |
| **P-B Inteligencia** | DS-48, DS-43, DS-44 | Tras 14 días de snapshots (DS-48 puede empezar antes) | 4-5 días | P-A; SerpApi y afiliado AliExpress |
| **P-C Ciclo de pruebas** | DS-45, DS-46, DS-47 + cambios multi-producto (§4) | Después del go-live (F8) | 5-7 días | Sistema de ventas funcionando |

**Primer producto:** si P-A/P-B ya tienen datos, sale de la primera shortlist. Si la API de Dropi aún no llega, elígelo a mano: busca candidatos en la app de Dropi, Expowinners o Dropdata y pásalos por el [prompt evaluador](prompts/evaluador_productos.md) en un chat. Así usas el mismo criterio desde el día 1.

## 6. Configuración (tabla `config`)
Ver los valores iniciales en [db/schema.sql](db/schema.sql): `multiplicador_precio`, `precio_venta_min/max`, `utilidad_min`, `stock_min`, `ventas_7d_min`, `efectividad_esperada`, `pesos_score`, `max_evaluaciones_ia_dia`, `juez_*`, y del comparador: `max_comparaciones_dia`, `descartar_si_ratio_local_mayor_a`, `mercado_umbrales`, `iva_importacion_umbral_usd`, `trm_usd_cop` y `url_busqueda_*`. Las fuentes por categoría están en la tabla `fuentes_categoria`.
