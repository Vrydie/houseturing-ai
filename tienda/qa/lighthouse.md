# Reporte Lighthouse Móvil (Vista Previa)

**Fecha:** 1 de Octubre de 2026

**ESTADO:** NO MEDIDO
**Razón:** La tienda se encuentra bajo contraseña (`SHOPIFY_STOREFRONT_PASSWORD`). No se cuenta actualmente con un script en el repositorio que integre Lighthouse con la sesión autenticada de Puppeteer para pasar el gate de contraseña, y no es posible correrlo de forma nativa desde la CLI o DevTools en este entorno sin interacción manual de sesión. Las métricas exactas (LCP y CLS) deberán medirse cuando se habilite un mecanismo de pruebas autenticado o se retire la contraseña.
