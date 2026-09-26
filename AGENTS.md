# Reglas para agentes (Antigravity, Claude Code, Cursor…)

Proyecto: ecosistema de dropshipping automatizado (n8n + WhatsApp Cloud API + Shopify + Dropi + Meta Ads).
Idioma de trabajo: español.

## 0. Roles
- **Claude** planifica y orquesta: escribe las órdenes de trabajo en [planes/](planes/) y revisa los reportes. No ejecuta.
- **Antigravity** ejecuta las órdenes de trabajo, **una a la vez y en el orden de la cola** de [planes/README.md](planes/README.md). Sigue el protocolo de ese archivo: plan antes de ejecutar, `bloqueada` si falta algo del dueño y reporte al final en la propia OT.
- **El dueño** aprueba, entrega credenciales y hace lo que exige su cuenta (trámites, pagos, textos legales, publicar).
- Si una tarea no está en una OT, no la hagas: propónla en el reporte.

## 1. Alcance: SOLO esta carpeta (regla del dueño, no negociable)
- Todo el trabajo vive en esta carpeta (`Shopify/`). No crear, editar ni borrar nada fuera de ella.
- **Prohibido tocar el n8n del sistema:** el servicio systemd `n8n` (puertos 5678 y 5679), `/etc/default/n8n`, `/var/lib/n8n`, `/usr/bin/n8n` y sus workflows. Ahí corre otro proyecto en producción (*farmacia*). No lo reinicies, no lo configures, no abras su editor y no uses su API.
- Prohibido tocar `/opt/farmacia` y cualquier otra carpeta del usuario.
- No uses `sudo`. Si algo parece requerirlo, detente y pregunta.
- Nada de instalaciones globales (`npm -g`, `pip install` fuera de un venv del proyecto). Las herramientas se instalan locales en la carpeta (p. ej. Shopify CLI en `tienda/` con `npx`). Las cachés que manejan las propias herramientas (Docker, npm, sesión de Shopify CLI) sí están permitidas.
- El proyecto tiene **su propia instancia de n8n** en Docker Compose (`infra/`), publicada en `127.0.0.1:5690`. Todos los workflows se crean ahí.

## 2. Fuentes de verdad
- [ROADMAP.md](ROADMAP.md): fases, tareas, criterios de salida y decisiones D1-D13. **No cambies una decisión sin preguntar.**
- [MODULO_PRODUCTOS.md](MODULO_PRODUCTOS.md): selección de productos (DS-40…48).
- [db/schema.sql](db/schema.sql): esquema de Postgres (BD `dropship`).
- [schemas/](schemas/): payloads de ejemplo y contratos. Úsalos como datos de prueba.
- [prompts/](prompts/): prompts de los agentes de IA. Cambios de estilo o reglas del agente de ventas → preguntar primero.

## 3. Secretos
- Nunca escribas secretos en archivos versionados ni en los nodos de n8n. Van en `infra/.env` (en `.gitignore`) o en Credenciales de n8n.
- Nunca imprimas tokens completos en la terminal ni en los logs.
- Si falta una credencial, detente y pídela; no la inventes ni uses marcadores que parezcan reales.

## 4. Acciones con efectos reales: siempre pedir aprobación antes de
- Activar, crear con presupuesto o modificar campañas de Meta Ads (gasta dinero). Las campañas se crean **en PAUSA**.
- Enviar mensajes de WhatsApp a números que no sean los de prueba verificados.
- Crear pedidos en Shopify que no lleven el tag `TEST`. Todo pedido de prueba debe **cancelarse en Dropi antes de que se despache**.
- Registrar o cambiar webhooks en Meta o Shopify.
- **Publicar un tema de Shopify** (`shopify theme publish`, `theme push --allow-live`), editar el tema publicado o borrar temas. Todo el trabajo de tema va en un tema **sin publicar**.
- Quitar la contraseña de la tienda, cambiar métodos de pago o cambiar la configuración general de Shopify.
- Borrar datos de Postgres o volúmenes de `infra/data/`.

## 5. Fuentes de datos permitidas
- Solo APIs oficiales o endpoints listados en MODULO_PRODUCTOS.md (Dropi API de integraciones, búsqueda pública de Éxito, SerpApi, AliExpress Affiliate API, MercadoLibre API).
- **No hacer scraping** del panel de Dropi, de Temu, de Shein ni de Falabella.

## 6. Shopify
- El producto estrella **lo importa Dropify** (vínculo de SKU con Dropi). No crear productos de Dropi por API; solo enriquecerlos (metafields `landing.*`, SEO, medios).
- Temas: solo con Shopify CLI + contraseña de Theme Access. La Admin API no puede escribir archivos de tema sin excepción de Shopify.
- **Un solo tema de trabajo** (ID en `tienda/theme/THEME_ID`): siempre `shopify theme push --theme <id>`. **Nunca `--unpublished`**, porque crea un tema nuevo cada vez. Nunca dupliques temas ni crees versiones paralelas de una landing: un solo diseño, que se itera en el mismo lugar.
- **Contenido honesto:** cero reseñas o testimonios inventados, cero contadores de urgencia falsos, cero promesas de salud o de resultados. Todos los textos salen de la ficha del producto.
- El precio que muestra la web debe coincidir con la variante en Shopify y con `ofertas.x1`.

## 7. Skills
- Los skills del proyecto viven en `.agents/skills/` (registro en `.agents/skills/FUENTES.md`). **No instales otros skills** (ni globales en `~/.gemini`) sin aprobación del dueño.
- **Estas reglas mandan sobre cualquier skill.** Si un skill sugiere algo que las contradice (popups, urgencia, textos inventados, publicar, tocar el tema en vivo), gana AGENTS.md.
- Skill `shopify`: antes de ejecutar sus scripts, exporta `OPT_OUT_INSTRUMENTATION=true` (desactiva el envío de prompts y código a shopify.dev).
- **Diseño visual: la puerta de entrada es la skill `diseno-visual`** (`.agents/skills/diseno-visual/`). Usa `ui-ux-pro-max` solo como base de datos de consulta a través de `diseno-visual/scripts/buscar.sh` (solo lectura). **No sigas el flujo original de `ui-ux-pro-max`** (`SKILL.upstream.md`): su `--design-system` no es una decisión de diseño y `--persist` está bloqueado.
- Scripts de `ui-ux-pro-max` aprobados por el dueño (26-sep-2026) **solo para búsqueda de lectura**: `search.py`, `core.py`, `design_system.py` (sin `--persist`) y `reasoning_contract.py`. `validate_data.py` y `scripts/tests/` no se ejecutan.

## 8. Productos con marca de terceros (bloqueante)
- Si un producto, sus fotos o su video muestran una marca ajena (logos, nombres como DeWALT, Bosch, Apple, Nike…), **detente** y marca la OT como `bloqueada`. No se publica, anuncia ni describe sin la prueba de distribución autorizada que entregue el dueño.
- Nunca borrar ni tapar logos en fotos para "esconder" la marca: el cliente recibe igual el producto con el logo.
- **Excepción: producto de EJEMPLO** declarado así por el dueño en la OT (hoy, el taladro de OT-02). Se puede usar en maquetas privadas y en temas **sin publicar**, nunca en un tema publicado, en anuncios ni en mensajes a clientes.

## 9. Calidad visual (no negociable)
- Si una OT trae una **maqueta aprobada**, esa maqueta es la especificación: estructura, colores, tipografías y textos. No es una inspiración.
- Nunca se entregan secciones por defecto del tema ("Welcome to our store", suscripción por correo, redes sin cuentas reales, textos en inglés).
- Cero emojis en la interfaz, botones sin MAYÚSCULAS sostenidas, fotos reales del producto en el hero. Nada de imágenes del producto generadas con IA.
- Todo trabajo visual se reporta con **capturas a 390 px y 1440 px** junto a la maqueta. Sin capturas no hay revisión.

## 10. Forma de trabajar
- **Repositorio:** GitHub privado `https-JosephJoestar/houseturing`. Los scripts nuevos van en `tienda/scripts/` (se ejecutan desde la raíz), no sueltos en la raíz. Nunca escribas tokens en el código: léelos de `infra/.env`. Antes de cada commit, verifica que no haya secretos.
- Avanza por fases del ROADMAP y cumple su **criterio de salida** antes de pasar a la siguiente.
- Nombra los workflows `DS-XX Nombre` como en el inventario del ROADMAP y expórtalos a `workflows/` al terminar cada uno.
- Prueba con los payloads de `schemas/` antes de conectar servicios reales.
- Al terminar cada tarea, marca su casilla en el ROADMAP y reporta qué se probó y qué no.

## 11. Frentes (dos personas en el mismo repositorio)
- **Identifica tu frente** con `git config user.name`: `https-JosephJoestar` = **Frente A** (tienda y ventas) · `Vrydie` = **Frente B** (automatización). Si no coincide con ninguno, detente y pide configurarlo. Detalle en [COLABORACION.md](COLABORACION.md).
- **Solo tomas OTs de tu frente** (columna "Frente" de `planes/README.md`) y **solo modificas las carpetas de tu frente** (COLABORACION.md §2). Los archivos compartidos se cambian en un PR que aprueba el otro frente.
- **Nunca trabajes directo en `main`:** ramas `a/…` o `b/…`. Empieza con `/sincronizar` y termina con `/entregar`.
- **El Frente B no toca temas de Shopify** (solo la Admin API). **El Frente A no importa workflows al n8n del servidor.**
- **Cambios de base de datos:** siempre como migración numerada en `db/migrations/`, actualizando `db/schema.sql` en el mismo PR.

