---
name: diseno-visual
description: "Diseño visual del proyecto HouseTuring: úsala al diseñar, maquetar, implementar o revisar cualquier parte visual (landing de producto, secciones del tema Shopify Horizon, maquetas, piezas para anuncios). Aplica el orden de autoridad del proyecto y consulta, en modo solo lectura, la base de datos de ui-ux-pro-max (paletas, tipografías, patrones de landing, reglas de UX y accesibilidad)."
---

# Diseño visual del proyecto

Esta skill **reemplaza el flujo de trabajo** de `ui-ux-pro-max`. De esa skill se usan solo su base de datos y su buscador, como material de consulta. Su archivo original quedó en `../ui-ux-pro-max/SKILL.upstream.md`, como referencia, y **no se sigue**.

## 1. Orden de autoridad (el primero manda)
1. **[AGENTS.md](../../../AGENTS.md):** contenido honesto, cero emojis, marcas de terceros, gates de revisión y capturas.
2. **La maqueta aprobada por el dueño**, si la OT tiene una. Es la especificación.
3. **`frontend-design`:** identidad propia y nada de estética genérica de IA.
4. **`ui-ux-pro-max`:** datos de referencia. **Consulta, no decide.**

## 2. Qué sirve de ui-ux-pro-max y qué no

| Sí: úsalo para | No: evítalo |
|---|---|
| Paletas por tipo de producto (`-d color`) | **`--design-system` como diseño final.** Su generador cae en defaults genéricos: en la prueba del 26-sep-2026 propuso índigo `#6366F1` con Rubik para un taladro. Puede servir como segunda opinión, nunca como decisión. |
| Parejas tipográficas (`-d typography`, `-d google-fonts`) y licencias (`data/google-font-licenses.json`) | **`--persist` / `--force`**: el buscador del proyecto los bloquea. La fuente de verdad es la maqueta y `tienda/DISENO.md`. |
| Reglas de UX y accesibilidad (`-d ux`, `-d web`) | Código por stack: **no hay perfil Shopify/Liquid**. `--stack html-tailwind` sirve solo como referencia de HTML/CSS. **No metas Tailwind en el tema.** |
| Patrones de landing (`-d landing`) y estilos (`-d style`) | Las rutas `${CLAUDE_PLUGIN_ROOT}/…` de su SKILL original: aquí no existen. |
| Iconos sugeridos (`-d icons`) | Librerías de iconos como dependencia: en el tema se traducen a SVG de trazo inline (snippets `icon-*.liquid`). |

## 3. Cómo buscar (solo lectura)

```bash
.agents/skills/diseno-visual/scripts/buscar.sh "<consulta EN INGLÉS>" -d <dominio> -n 5
```

- Dominios: `style`, `color`, `typography`, `google-fonts`, `landing`, `product`, `ux`, `web`, `icons`, `chart`.
- **La base está en inglés:** "contraentrega" o "WhatsApp" no aparecen. Traduce la necesidad.
- **Si hay 0 resultados**, reintenta con los "Closest known terms" que sugiere la salida. No inventes un "resultado de la base".
- Solo usa Python 3 del sistema, sin dependencias ni red.

| Necesidad | Consulta |
|---|---|
| Paleta por categoría del producto | `buscar.sh "hardware tools construction" -d color` |
| Pareja tipográfica por carácter | `buscar.sh "condensed bold industrial" -d typography` |
| Estructura de landing de un producto | `buscar.sh "product demo features" -d landing` · `"minimal single column"` |
| Confianza y prueba social | `buscar.sh "trust badges guarantee" -d landing` |
| Botones y barra fija en móvil | `buscar.sh "touch target mobile" -d ux` |
| Contraste y foco | `buscar.sh "color contrast" -d ux` · `buscar.sh "focus visible" -d web` |
| Movimiento | `buscar.sh "reduced motion" -d ux` |
| Iconos | `buscar.sh "shield delivery truck cash" -d icons` |

## 4. Traducir resultados al tema Shopify Horizon
- **Colores:** van a los esquemas de color del tema y a variables CSS de las secciones. Usa los nombres de token de la maqueta: grafito, acero, línea, gris claro, acento, acción.
- **Tipografías:**
  - Si están en la biblioteca de fuentes de Shopify (`font_picker`), úsalas desde ahí.
  - Si no, súbelas como archivo del tema (woff2) con `@font-face`, verificando la licencia en `data/google-font-licenses.json`.
  - Nada de `@import` de Google Fonts en el tema.
- **Espaciados y tamaños:** como ajustes de sección (`range`), con los valores de la maqueta.
- **Textos e imágenes:** desde metafields `landing.*` y la galería del producto, nunca escritos directo en el Liquid.

## 5. Flujo para la landing de un producto nuevo (Módulo P, DS-45)
1. **Brief:** la ficha y la evaluación IA (avatar, ángulos, categoría, fotos disponibles).
2. **2 o 3 búsquedas:** paleta por categoría, tipografía por carácter y patrón de landing. Anota qué tomaste y qué descartaste.
3. **Plan de diseño** (`frontend-design`): 4-6 colores hex, tipografías con su rol, boceto por sección y **un solo lugar audaz**.
4. **Maqueta (Claude) → aprobación del dueño.**
5. **Implementación (Antigravity) sobre la plantilla existente:** cambiar datos, tokens y fotos. Tocar Liquid solo si la maqueta pide una sección nueva.
6. **QA** con el checklist de abajo y capturas a 390 y 1440 px, lado a lado con la maqueta.

## 6. Patrones fijos del proyecto
- **Un solo diseño por landing.** En la maqueta, una pantalla móvil más la nota de especificación. Se itera **sobre el mismo archivo**, sin páginas v1, v2 ni copias. En Shopify, un solo tema de trabajo (ver AGENTS.md).
- **Botón de WhatsApp con latido:** latido doble cada 6 s (escala 1.05 + anillo verde de 16 px), pausado con hover o foco, desactivado con `prefers-reduced-motion`, y solo un botón animado visible a la vez. Barra fija inferior en móvil, que aparece cuando el botón del hero sale de la pantalla.
- **Precio destacado:** etiqueta de precio con el color de acento y entrada tipo sello (una vez). En la barra fija, el precio va en el color de acento.

## 7. Checklist de entrega
- [ ] Cero emojis en la interfaz; iconos SVG de trazo.
- [ ] Contraste de texto ≥ 4.5:1 (≥ 3:1 en textos de 24 px o más). El verde de WhatsApp siempre con texto oscuro.
- [ ] Botones de al menos 44 px de alto en móvil y al menos 8 px entre elementos tocables.
- [ ] Foco visible con teclado, `prefers-reduced-motion` respetado y transiciones de 150 a 300 ms.
- [ ] Probado a 390, 768, 1024 y 1440 px.
- [ ] Sin secciones por defecto del tema, sin textos en inglés, sin urgencia falsa y sin reseñas inventadas.
- [ ] Fotos reales del producto (o marcadas como provisionales si es un producto de ejemplo).
- [ ] Nada de estética genérica: sin degradados de relleno, sin índigo o morado por defecto, sin Inter, Roboto ni Arial como tipografía principal.
