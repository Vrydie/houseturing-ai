# Órdenes de trabajo (OT)

**Frentes** (detalle en [COLABORACION.md](../COLABORACION.md)):
- **Frente A — Tienda y ventas:** `https-JosephJoestar` (dueño). Claude planifica y revisa; Antigravity ejecuta.
- **Frente B — Automatización:** `Vrydie`. Antigravity Pro ejecuta. El dueño revisa los PR, si quiere con Claude.

**El dueño** aprueba, pone credenciales y hace lo que exige su cuenta o su criterio (trámites, pagos, textos legales, publicar).

## Comandos de Antigravity
| Comando | Para qué |
|---|---|
| `/tomar-ot` | Tomar y ejecutar la siguiente OT `lista` de tu frente |
| `/sincronizar` | Traer lo último de GitHub sin pisar al otro frente |
| `/entregar` | Revisar secretos y carpetas, hacer commit, subir y abrir el PR |
| `/redactar-ot` | Frente B: redactar la siguiente OT desde el ROADMAP, como `borrador` |

## Protocolo
1. Cada agente toma **una OT a la vez de su frente**, en el orden de la cola, cuando está `lista` y sus dependencias están `cerradas`.
2. Antes de ejecutar comandos, muestra su plan al usuario.
3. Si falta una precondición del dueño, marca la OT como `bloqueada`, anota qué falta y se detiene.
4. **Las revisiones de diseño y los gates bloqueantes son obligatorios:** al llegar a uno, se detiene y espera la aprobación.
5. Al terminar, llena el **Reporte de ejecución** de la OT (qué hizo, evidencia, qué no probó, desvíos, decisiones que necesita), pasa a `para revisión` y entrega con `/entregar`.
6. **Nadie marca su propia OT como `cerrada`:**
   - Frente A: la cierra Claude.
   - Frente B: la cierra el dueño al revisar el PR.

Estados: `borrador` → `lista` → `en curso` → `bloqueada` → `para revisión` → `cerrada`.

## Cola

| OT | Frente | Responsable | Tema | Fase | Estado | Depende de |
|---|---|---|---|---|---|---|
| [OT-01](OT-01_infra_fase1.md) | B | Vrydie | Infraestructura del proyecto (n8n propio + Postgres en Docker) | F1 | para revisión | — |
| [OT-02](OT-02_tienda_shopify.md) | A | dueño | Tienda Shopify: plantilla de landing (producto de ejemplo) | T | reabierta — gate C6 7.ª ronda | — |
| [OT-03](OT-03_entrada_whatsapp.md) | B | Vrydie | Entrada de WhatsApp (DS-01), envío (DS-03) y cobertura (DS-T1) | F4 / F5 | en curso | OT-01 |
| OT-04 | B | Vrydie | Agente de ventas (DS-02) y herramientas de pedido (DS-T2 a T5) | F4 / F5 | por redactar (`/redactar-ot`) | OT-03 |
