# Implementación de la Maqueta - Diseño Único

Este documento describe cómo se implementó la especificación de diseño en la tienda Shopify para el producto de ejemplo (Taladro 48V).

## Tokens del Tema
- **Grafito:** `#121417`
- **Acero:** `#1D2126`
- **Línea:** `#2E343B`
- **Gris claro:** `#F1F2F3`
- **Naranja:** `#F2661B`
- **WhatsApp:** `#25D366` (texto `#0B2B1A`)
- **Tipografías:**
  - Títulos, cifras y precios: *Barlow Condensed* (700/800)
  - Texto general: *Barlow* (400-700)

## Animaciones e Interacción
- **Latido doble (Botón de WhatsApp):** El botón principal activo pulsa cada 6 segundos (`transform: scale(1.05)` con un anillo esparcido) para atraer la acción sin ser intrusivo. Se pausa al hacer `hover` o `focus`.
- **Preferencia de movimiento:** Todas las animaciones respetan `prefers-reduced-motion: no-preference`.
- **Aparición Condicional:** Un script usando `IntersectionObserver` oculta el botón flotante inferior (sticky) y solo lo muestra cuando el CTA principal del hero sale del viewport. Esto asegura que solo palpite un botón a la vez.
- **Sello:** El precio principal entra con rotación y escala al cargar la página (`0.55s`).

## Estructura de Secciones (Modulares)
La Landing Page se implementó construyendo 7 secciones nativas de Shopify:
1. `landing-hero.liquid`: A 2 columnas en escritorio (>1024px, centrado máx. 1200px) y una columna en móvil.
2. `landing-incluye.liquid`
3. `landing-pasos.liquid`
4. `landing-garantia.liquid`
5. `landing-faq.liquid`
6. `landing-cierre.liquid`
7. `landing-sticky.liquid`: Barra inferior dinámica en móvil.

## Metafields (Datos)
Todos los textos se inyectan a través de los metafields `landing.*` sin quemarlos en Liquid, y las imágenes salen directamente de la galería del producto (`images[0]`, `images[1]`, etc.).
