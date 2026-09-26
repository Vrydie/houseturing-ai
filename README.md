# HouseTuring — ecosistema de dropshipping automatizado

Tienda Shopify + agente de ventas con IA por WhatsApp + n8n + Dropi + Meta Ads.
Repositorio **privado**.

## Cómo se trabaja
- **Claude** planifica y escribe las órdenes de trabajo en [`planes/`](planes/README.md).
- **Antigravity** las ejecuta y reporta en la misma orden.
- **El dueño** aprueba, entrega credenciales y publica.
- Reglas para cualquier agente: [`AGENTS.md`](AGENTS.md).

## Estructura

| Carpeta / archivo | Qué contiene |
|---|---|
| [`ROADMAP.md`](ROADMAP.md) | Plan por fases, decisiones de arquitectura y riesgos |
| [`MODULO_PRODUCTOS.md`](MODULO_PRODUCTOS.md) | Motor de selección de productos (Dropi + comparador de mercado) |
| [`planes/`](planes/) | Órdenes de trabajo (OT) y su cola |
| [`db/schema.sql`](db/schema.sql) | Base de datos de negocio (Postgres) |
| [`schemas/`](schemas/) | Payloads de ejemplo y contratos JSON |
| [`prompts/`](prompts/) | Prompts del agente de ventas y de los módulos de IA |
| [`tienda/`](tienda/) | Tema de Shopify (Horizon), contenido, scripts y fotos |
| `infra/` | Instancia propia de n8n y Postgres (Docker). Su `.env` **no** se versiona |
| `.agents/skills/` | Skills del proyecto (fuentes y licencias en [`FUENTES.md`](.agents/skills/FUENTES.md)) |

## Secretos y el archivo `.env`
- **Las credenciales viven solo en `infra/.env`, en tu computador. Nunca se suben a GitHub:** el `.gitignore` lo bloquea.
- **En el repositorio va [`.env.example`](.env.example):** la lista de variables, sin valores. Sirve de plantilla y de inventario.
- **En otro computador o en el servidor:** copia `.env.example` a `infra/.env` y llena los valores.
- **Respaldo:** guarda una copia de los valores en un gestor de contraseñas (Bitwarden, 1Password…). Sobre todo `N8N_ENCRYPTION_KEY`: sin ella no se recuperan las credenciales de n8n.
- **Los scripts** (`tienda/scripts/*.mjs`) leen las credenciales de `infra/.env` con `dotenv`. Ningún token va escrito en el código.
- **Si un secreto llegara a subirse por error:** se revoca y se genera uno nuevo; borrarlo del repositorio no basta.

## Scripts de la tienda
Se ejecutan desde la raíz del repositorio (usan rutas como `tienda/theme/...`):

```bash
cd tienda && npm install && cd ..
node tienda/scripts/<script>.mjs
```
