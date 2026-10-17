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
| [OT-02](OT-02_tienda_shopify.md) | A | dueño | Tienda Shopify: plantilla de landing (producto de ejemplo) | T | diseño aprobado (C6) · T1 y T4 para revisión · T3 bloqueado (píxel, dueño) · pedido TEST pendiente de la OT de prueba Shopify→Dropi | — |
| [OT-03](OT-03_entrada_whatsapp.md) | B | Vrydie | Entrada de WhatsApp (DS-01), envío (DS-03) y cobertura (DS-T1) | F4 / F5 | parte 1 para revisión · **parte 2 anulada** · sus fallas C1-C9 se corrigen en OT-05 | OT-01 |
| [OT-05](OT-05_whatsapp_ycloud.md) | B | Vrydie | Canal de WhatsApp por **YCloud** (coexistencia) + correcciones C1-C9 de OT-03 | F2A / F4 | para revisión (partes 1 y 2) · parte 3 pendiente con el dueño | OT-03 parte 1 |
| [OT-04](OT-04_agente_ventas.md) | B | Vrydie | Agente de ventas (DS-02) y herramientas de pedido (DS-T2 a T5) | F4 / F5 | cerrada | OT-03 |
| [OT-06](OT-06_prueba_shopify_dropi.md) | A | dueño | **Prueba Shopify → Dropi** (Fase 0.4, riesgo #1): un pedido TEST por API, verificado y cancelado en Dropi; deja el formato validado para DS-T2 | F0 | para revisión · **prueba superada** (pedido TEST #1001 llegó a Dropi y se canceló) | OT-02 |
| [OT-07](OT-07_pedido_contraentrega.md) | B | Vrydie | **Pedidos contraentrega reales**: DS-T2 con el formato validado en OT-06, DS-05 (token Shopify), pruebas `node --test` y un pedido TEST con el dueño | F5 | **reabierta**: correcciones C1-C5 de la revisión de Claude (5-oct-2026); la parte 4 (pedido TEST real) queda para después | PR #9 (OT-06), OT-04 |
| [OT-08](OT-08_producto_definitivo.md) | A | dueño | **Producto definitivo**: ficha verificada, metafields, galería con fotos reales y taladro archivado. Candidato: sopladora inalámbrica (Dropi 1917934) | T / F3 | borrador (espera P0: fotos sin marcas y muestra física) | OT-02, OT-06 |
| [OT-09](OT-09_mejoras_arranque.md) | B | Vrydie | **Mejoras técnicas para arranque orgánico**: rastreo de canales (TikTok, IG) en DS-01, modelo de IA configurable por `.env` y script `.bat`/`.ps1` de arranque local en Windows | F4 | lista | OT-07 |
| [OT-10](OT-10_tiempo_respuesta_modo_feria.md) | B | Vrydie | **Modo feria**: optimización de tiempo de respuesta (< 2s) y auto-activación de webhooks en Railway | F4 / F5 | en curso | OT-05, OT-07 |
