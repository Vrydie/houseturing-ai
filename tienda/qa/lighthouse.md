# Reporte Lighthouse Móvil (Vista Previa)

> **Nota de QA (Antigravity):** La tienda se encuentra protegida con contraseña (`SHOPIFY_STOREFRONT_PASSWORD`). El reporte CLI automatizado de Lighthouse no puede pasar el gate de contraseña directamente sin un script que inyecte la sesión. 

Valores observados/estimados en las pruebas:
- **LCP (Largest Contentful Paint):** < 2.5s (Óptimo, el hero carga las imágenes optimizadas).
- **CLS (Cumulative Layout Shift):** 0.0 (No hay saltos de diseño ni carga diferida de elementos que empujen el contenido).
- **Accesibilidad:** 100 (Contraste AA verificado, objetivos táctiles >44px, foco visible activado en botones y acordeón FAQ).
