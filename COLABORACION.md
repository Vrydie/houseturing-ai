# Colaboración: dos frentes sin pisarse

## 1. Quién hace qué

| Frente | Responsable | Herramientas | Qué cubre |
|---|---|---|---|
| **A — Tienda y ventas** | `https-JosephJoestar` (dueño) | Claude (planifica) + Antigravity (ejecuta) | Tienda Shopify, diseño, fichas de producto, elección de productos, creativos y anuncios de Meta, cuentas y pagos |
| **B — Automatización** | `Vrydie` | Antigravity Pro | Infraestructura (Docker, n8n, Postgres), workflows de n8n, base de datos, agente de WhatsApp, conexiones con Dropi, Shopify y Meta, parte automática del Módulo P |

El agente sabe en qué frente está por `git config user.name` (ver [AGENTS.md §11](AGENTS.md)).

## 2. Carpetas por frente

| Frente A (dueño) | Frente B (Vrydie) | Compartido: cambia solo con aprobación de ambos |
|---|---|---|
| `tienda/` | `infra/`, `workflows/`, `tests/` | `AGENTS.md`, `ROADMAP.md`, `COLABORACION.md` |
| `prompts/base_conocimiento_producto.md` | `db/` (migraciones y semillas) | `planes/README.md` (la cola) |
| `prompts/generador_ficha_producto.md` | `prompts/plantillas_whatsapp.md` | `schemas/` (contratos entre frentes) |
| `.agents/skills/diseno-visual/` | `prompts/evaluador_productos.md`, `prompts/emparejador_mercado.md` | `prompts/agente_ventas_system.md` (B lo implementa; el tono lo aprueba el dueño) |
| `planes/OT-*` del Frente A | `planes/OT-*` del Frente B | `MODULO_PRODUCTOS.md`, `db/schema.sql` |

**Puntos de contacto entre frentes** (ya definidos en `schemas/`): cómo se crean los pedidos en Shopify (tags `wa:` y atributos), la ficha del producto que usa el agente (metafields `landing.*` y `productos.base_conocimiento`) y el código `(web-SKU)` del botón de WhatsApp. Si alguno cambia, se abre un PR y lo aprueba el otro.

## 3. Git
- **Nadie trabaja directo en `main`.** Ramas: `a/<tema>` para el Frente A y `b/<tema>` para el Frente B (ej.: `b/ot-03-entrada-whatsapp`).
- **Al empezar el día:** `/sincronizar`. **Al terminar una tarea:** `/entregar`, que revisa secretos y carpetas, hace commit, sube la rama y abre el PR.
- **PR de avance con solo archivos de tu frente:** lo puedes unir tú mismo.
- **PR que entrega una OT:** lo revisa el dueño (Frente B) o Claude (Frente A) antes de unirlo.
- **PR que toca algo compartido:** necesita la aprobación del otro.
- **Límite del plan gratuito:** GitHub gratis no permite bloquear `main` ni aplicar `CODEOWNERS` en repositorios privados. Por ahora es un acuerdo; con GitHub Pro o Team se vuelve obligatorio y `.github/CODEOWNERS` ya está listo.

## 4. Sistemas compartidos
- **Shopify:** solo el Frente A sube cambios al tema de trabajo (`tienda/theme/THEME_ID`). El Frente B usa la **Admin API** (pedidos, metafields, webhooks) y **nunca** toca temas.
- **n8n:** cada uno puede tener su copia local (`infra/`). La del Frente B es la de desarrollo. Los workflows viven exportados en `workflows/`, y solo el Frente B los importa al servidor.
- **Base de datos:** no se edita `db/schema.sql` en paralelo. Cada cambio es una **migración numerada** en `db/migrations/`, que además actualiza `schema.sql` en el mismo PR.
- **Meta, WhatsApp y Dropi:** accesos propios para cada persona (rol en el Business Manager y en la app de Meta). No se prestan contraseñas.

## 5. Credenciales
- Cada persona tiene **su propio `infra/.env`**, creado a partir de [`.env.example`](.env.example). Nunca se sube a git.
- Los valores se comparten por una **bóveda compartida** del gestor de contraseñas (Bitwarden, 1Password…), nunca por chat.
- Si un secreto se filtra: se revoca y se genera uno nuevo.

## 6. Arranque de Vrydie (una sola vez)
- [ ] Aceptar la invitación al repositorio y clonarlo: `git clone https://github.com/https-JosephJoestar/houseturing.git`
- [ ] Configurar la identidad (así su agente sabe que es el Frente B):
  `git config user.name "Vrydie"` y `git config user.email "<su-id>+Vrydie@users.noreply.github.com"`
- [ ] Instalar Docker y `gh` (GitHub CLI), y autenticarse: `gh auth login`.
- [ ] Copiar `.env.example` a `infra/.env` y llenar los valores que el dueño comparta por la bóveda (ver §7).
- [ ] Abrir la carpeta en Antigravity y escribir: **`/tomar-ot`**.

## 7. Qué necesita Vrydie del dueño
| Para | Qué | Cuándo |
|---|---|---|
| OT-01 | Nada (se generan secretos locales) | Ya |
| OT-03 parte 1 | Nada (pruebas con payloads de ejemplo) | Ya |
| ~~OT-03 parte 2~~ | Anulada: la reemplaza OT-05 (D1 revisada el 28-sep-2026) | — |
| OT-05 | Cuenta de YCloud con la WABA en el **BM del dueño**, saldo cargado, `YCLOUD_API_KEY`, `YCLOUD_WEBHOOK_SECRET`, número de la empresa y WABA ID. El túnel ya no necesita dominio: Antigravity entrega una URL temporal y el dueño la pega en el panel de YCloud | Ya |
| OT-04 en adelante | Client ID y Secret de la app de Shopify; API key del LLM; bot de Telegram; acceso a la API de Dropi | Según la orden |

## 8. Revisión y cierre de órdenes de trabajo
- **Frente A:** Claude revisa el reporte y cierra.
- **Frente B:**
  - El agente de Vrydie entrega un PR con evidencia (capturas, salidas de prueba) y el reporte en la OT.
  - El dueño revisa el PR, si quiere con Claude, y cierra la OT.
  - Cuando no hay OTs listas del Frente B, el agente de Vrydie puede **redactar la siguiente** con `/redactar-ot` a partir del ROADMAP. Queda como `borrador` hasta que el dueño la apruebe.
