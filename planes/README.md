# Órdenes de trabajo (OT)

**Roles:**
- **Claude** planifica y orquesta: escribe las órdenes de trabajo y revisa los reportes.
- **Antigravity** ejecuta: construye, prueba y reporta.
- **El dueño** aprueba, pone credenciales y hace lo que exige su cuenta o su criterio (trámites, pagos, textos legales, publicar).

## Protocolo
1. Antigravity toma **una OT a la vez**, en el orden de la cola, cuando su estado es `lista`.
2. Antes de ejecutar comandos, muestra su plan al dueño.
3. Si falta una precondición del dueño, marca la OT como `bloqueada`, anota qué falta y se detiene.
4. **Las revisiones de diseño y los gates marcados como bloqueantes son obligatorios:** al llegar a uno, detente y espera la aprobación. Nunca marques una OT como `cerrada`; eso lo hace Claude.
5. Al terminar, llena la sección **Reporte de ejecución** de la OT: qué hizo, qué probó (con evidencia), qué no probó, desvíos del plan y decisiones que necesita. Cambia el estado a `para revisión`.
6. Claude revisa el reporte, marca la OT como `cerrada` (o abre correcciones) y prepara la siguiente.

Estados: `borrador` → `lista` → `en curso` → `bloqueada` → `para revisión` → `cerrada`.

## Cola

| OT | Tema | Fase del ROADMAP | Estado | Depende de |
|---|---|---|---|---|
| [OT-01](OT-01_infra_fase1.md) | Infraestructura del proyecto (n8n propio + Postgres) | F1 | lista | — |
| [OT-02](OT-02_tienda_shopify.md) | Tienda Shopify: skills de diseño (T-S), landing del producto estrella, páginas, políticas, tema | T (nueva) | para revisión de diseño | Precondiciones T0 del dueño |
| OT-03 | Entrada WhatsApp (DS-01) + cobertura (DS-T1) con payloads de prueba | F4 / F5 | por escribir | OT-01 |
