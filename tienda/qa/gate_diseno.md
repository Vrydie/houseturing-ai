# Revisión de diseño — Gate C6 (OT-02)

**Revisó:** Claude · **Fecha:** 26-sep-2026
**Especificación:** [maqueta — diseño único](https://claude.ai/artifact/18zUfiY7eJS2L9PzGwTgaD) (`project/Main.dc.html`, 390 × 5600)
**Vista previa revisada:** `https://zp1wvd-02.myshopify.com?preview_theme_id=157512106102`

## Veredicto: **NO PASA**

El criterio de aceptación de la corrección era: *"a simple vista, la vista previa y la maqueta son la misma página, pero con las fotos reales."* No se cumple. La maqueta tiene 13 bloques y la plantilla implementa 7; de esos 7, ninguno reproduce la maqueta. Además el gate se entregó incompleto: no se puede dar por revisado lo que no tiene evidencia.

---

## A. La evidencia no cumple C6 (bloqueante antes de mirar el diseño)

| # | Qué pide C6 | Qué se entregó |
|---|---|---|
| A1 | Capturas a **390 px y a 1440 px** | Solo 390 px. Las nueve imágenes miden entre 394 y 402 px de ancho. **No hay una sola captura de escritorio**, así que el hero de 2 columnas ≥1024 px y el máximo de 1200 px quedan sin verificar. |
| A2 | **Lado a lado con la maqueta** | Las celdas de la izquierda dicen `[Captura de maqueta v2]`. No hay ninguna captura de la maqueta. |
| A3 | Sección por sección | Faltan 5 secciones de la maqueta, porque no se construyeron (ver B). |
| A4 | Captura de la barra fija | `barrafija.png` (401 × 63) **no es la barra fija: es un recorte del header** (hamburguesa, "HouseTuring", cuenta y carrito). La barra fija sigue sin evidencia. |

Aparte: el documento hablaba de "maqueta v2". Esa versión se eliminó. La especificación es el **diseño único** del artifact, que es contra el que se hizo esta revisión.

---

## B. Comparación sección por sección

| # | Maqueta (especificación) | Vista previa | Estado |
|---|---|---|---|
| 1 | Barra de anuncio `#0B0D0F`: "Envío gratis a toda Colombia y pagas al recibir" | No existe | **Falta** |
| 2 | Header `#121417`: logotipo "HouseTuring" en Barlow Condensed 800 + botón pastilla de WhatsApp | Header **claro** con hamburguesa, cuenta, carrito y selector 🇨🇴/ES | **No cumple** |
| 3 | Hero: foto de 440 px + chip "Kit completo con 2 baterías" + etiqueta de precio naranja rotada −3° + h1 **blanco en minúscula** "El taller completo en un solo maletín" + 3 cifras (2 / 3 / 30) + CTA + microcopy | **Sin foto.** Título naranja en MAYÚSCULAS "ATRAVIESA CONCRETO, METAL Y MADERA SIN ESFUERZO", precio suelto en naranja, sin chip, sin cifras, sin microcopy, todo centrado | **No cumple** |
| 4 | Franja de confianza `#1D2126`, 3 iconos (pagas al recibir · envío 2-5 días · garantía 30 días) | No existe | **Falta** |
| 5 | "Míralo funcionando": foto atenuada + botón de reproducir de 76 px + etiqueta "Video de 37 s" | No existe. El video se metió dentro de "¿Qué incluye?" | **Falta** |
| 6 | "Todo lo que trae el maletín" sobre `#F1F2F3`, alineado a la izquierda, foto del maletín en tarjeta blanca, **12 ítems en 2 columnas** con círculo grafito y check naranja | "¿QUÉ INCLUYE?" centrado en mayúsculas, video, **lista de 1 columna, 10 ítems**, check naranja suelto, fondo en degradado | **No cumple** |
| 7 | "Un taladro, tres modos": 3 tarjetas `#1D2126` con icono naranja de 56 px | No existe | **Falta** |
| 8 | "Por separado o en un solo maletín": tabla comparativa de 5 filas sobre blanco | No existe | **Falta** |
| 9 | Garantía: tarjeta **blanca** alineada a la izquierda, círculo grafito con escudo naranja, "Garantía de 30 días", enlace "Ver condiciones de garantía" | Caja con borde gris, centrada, escudo gris, "GARANTÍA" en mayúsculas, **sin el enlace a condiciones** | **No cumple** |
| 10 | Preguntas frecuentes sobre **blanco**, título grafito, primera pregunta abierta | Sobre grafito, título **naranja en MAYÚSCULAS** | **No cumple** |
| 11 | Cierre `#121417`: "¿Listo para arreglar lo que falta en casa?" + etiqueta de precio naranja rotada + CTA + horario de atención | "¿LISTO PARA TRABAJAR?" en mayúsculas naranja, precio blanco suelto, foto arriba, sin horario | **No cumple** |
| 12 | Footer legal `#0B0D0F`: 5 enlaces, razón social, NIT, dirección, © | Sin captura | **Sin verificar** |
| 13 | Barra fija: precio naranja + "Pagas al recibir" + botón | Sin captura (A4) | **Sin verificar** |
| — | *No está en la maqueta* | Sección "CÓMO PEDIR" con 3 pasos numerados | **Sobra** |

---

## C. Incumplimientos de AGENTS.md y de la OT

1. **MAYÚSCULAS sostenidas en todos los títulos.** `text-transform: uppercase` en el hero, incluye, pasos, garantía, FAQ y cierre. La maqueta no usa mayúsculas en ningún título; AGENTS.md §9 las prohíbe expresamente. Es el mismo punto por el que se reabrió la OT.
2. **El hero no tiene foto del producto.** AGENTS.md §9 lo exige y la maqueta lo especifica (`1cf6eba0`, la persona instalando la repisa). Hoy la foto que aparece bajo el hero es otra imagen de la galería.
3. **Titular naranja.** El hero repite el patrón del "titular rojo" por el que se reabrió la OT. En la maqueta el naranja es solo para las cifras, la etiqueta de precio y los iconos; el titular va en blanco.
4. **Tipografías mezcladas.** `config/settings_data.json` sigue en **Inter** de fábrica (`type_body_font: inter_n4`, `type_heading_font: inter_n7`). Barlow se inyecta aparte desde `layout/theme.liquid` con `!important`, así que conviven dos sistemas: el logotipo del header, que no es un `h*`, sale en Inter. C3 no está terminado.
5. **C2 sin terminar.** Siguen visibles la cuenta, el carrito y el selector de país/idioma (`show_country: true`, `show_language: true` en `sections/header-group.json`).

---

## D. Hallazgos de código que no se ven en las capturas

1. **Número de WhatsApp inventado.** `https://wa.me/573000000000` está quemado en `landing-hero`, `landing-pasos`, `landing-cierre` y `landing-sticky`. AGENTS.md §3 prohíbe los marcadores que parezcan reales. **Hoy todos los CTA de la vista previa apuntan a un número falso.** Debe salir de `infra/.env` / de un ajuste del tema.
2. **Imagen quemada en el Liquid.** `landing-incluye.liquid` usa `{{ 'video_taladro.mp4' | asset_url }}`, un archivo del tema, en lugar de la galería del producto. Contradice C4 y lo que afirma el propio `DISENO.md` ("las imágenes salen directamente de la galería del producto").
3. **Textos sin respaldo en la ficha.** `prompts/base_conocimiento_producto.md` sigue siendo la **plantilla vacía**, con `<Producto Estrella>` y la tabla `ofertas` en blanco. "48V", "30 días de garantía", "2 a 5 días hábiles" y "menos de 48 horas" no salen de ninguna ficha: se inventaron. La propia OT marca **"48V"** como afirmación a eliminar antes de publicar (AGENTS.md §6, contenido honesto).
4. **Precio.** La web muestra **$260.000,00** y la maqueta **$219.900**. Con la tabla `ofertas` vacía no se puede verificar la coherencia que exige AGENTS.md §6 (web = variante = `ofertas.x1`). Decidir también si se muestran los decimales `,00`.
5. **Las animaciones no son las de la maqueta.**
   - `latido`: la maqueta hace un **latido doble** (dos pulsos a 6 % y 18 %, con anillo de 16 px). El tema hace **cinco** pulsos por ciclo y el anillo del primero es de 8 px.
   - `sello`: la maqueta va de `scale(1.2) rotate(-3deg)` a `rotate(-3deg)` (la etiqueta queda inclinada). El tema va de `scale(2) rotate(-15deg)` a `rotate(0deg)`, sobre un precio que ni siquiera es una etiqueta.
   - `prefers-reduced-motion` sí está bien resuelto.
6. **Error de JavaScript latente.** En `landing-hero.liquid` el `IntersectionObserver` comprueba `heroBtn && stickyBar`, pero después usa `stickyBtn.classList` sin comprobarlo. En una plantilla sin `landing-sticky` (o si cambia el id), la primera intersección lanza una excepción y el botón del hero se queda sin latido.
7. **La barra fija depende del hero.** Arranca con `transform: translateY(100%)` en línea y solo la muestra el script del hero. Si esa sección no está o su script falla, la barra no aparece nunca.

---

## E. Lo que está bien y no hay que rehacer

- La arquitectura por secciones (`landing-*.liquid`, una por bloque) con el ajuste `main_product` y lectura de metafields `landing.*`: es lo correcto y es la base para el producto final.
- Los 7 tokens de color de la maqueta están definidos en `:root` con los valores exactos.
- FAQ con `<details>/<summary>` nativo, y el manejo de `prefers-reduced-motion`.
- Cero emojis y el botón "Pedir por WhatsApp" en minúscula normal.
- No hay reseñas inventadas ni contadores de urgencia.

## F. Marca de terceros

Las fotos del producto de ejemplo muestran el logotipo **DeWALT**. Por AGENTS.md §8 se admite **solo** por ser el producto de ejemplo declarado, en un tema **sin publicar** y con la tienda protegida con contraseña. No se publica, no se anuncia y no se usa en mensajes a clientes.

---

## Qué falta para volver a presentar el gate

1. Construir los 13 bloques de la maqueta, en su orden, con sus colores, tipografías, tamaños y textos, y quitar la sección "Cómo pedir" que no está en la especificación.
2. Sacar el número de WhatsApp inventado de las cuatro secciones.
3. Llenar la ficha del producto y rehacer los textos desde ahí, sin "48V" ni tiempos inventados. Cuadrar el precio con la variante y con `ofertas.x1`.
4. Terminar C2 y C3 (quitar cuenta, carrito y selector de idioma; poner Barlow en los ajustes del tema).
5. Volver a capturar **a 390 px y a 1440 px**, sección por sección, **con la maqueta al lado**, incluida la barra fija de verdad y el footer.
