---
name: redactar-ot
description: "Frente B (Vrydie): redacta la siguiente orden de trabajo a partir del ROADMAP cuando la cola no tiene OTs listas de tu frente. Queda como borrador hasta que el dueño la apruebe. Úsala cuando /tomar-ot no encuentre trabajo o cuando el usuario diga 'prepara la siguiente OT' o /redactar-ot."
---

# /redactar-ot

1. **Confirma:** estás en el Frente B y `planes/README.md` no tiene OTs del Frente B en estado `lista`. Si las hay, usa `/tomar-ot`.
2. **Elige el siguiente bloque de trabajo** que ninguna OT cubra todavía, en este orden:
   - `ROADMAP.md`: F4 → F5 → F6 → F7 → F8.
   - `MODULO_PRODUCTOS.md`: P-A → P-B → P-C.

   Respeta las dependencias. Una OT = una entrega que se pueda probar, de 1 a 4 días de trabajo.
3. **Rama:** `b/borrador-ot-XX-<slug>`.
4. **Redacta `planes/OT-XX_<slug>.md` copiando la estructura de `planes/OT-03_entrada_whatsapp.md`:**
   - Encabezado: `**Estado:** borrador · **Frente:** B · **Responsable:** Vrydie · **Ejecuta:** Antigravity`.
   - Lecturas obligatorias: las secciones exactas del ROADMAP, `schemas/` y `db/schema.sql`.
   - Objetivo, en 2 o 3 líneas.
   - Precondiciones **del dueño**: credenciales, accesos, decisiones.
   - Restricciones: las de `AGENTS.md` que apliquen, más las específicas.
   - Tareas numeradas con detalle técnico real: nodos de n8n, tablas y columnas, contratos de `schemas/`, variables de `.env.example`. Nada genérico.
   - Pruebas: casos con entrada y resultado esperado, incluidos los casos borde.
   - Criterios de aceptación verificables: comandos y la salida esperada.
   - Sección vacía "Reporte de ejecución".
5. **Cola:** agrega la fila en `planes/README.md` con estado `borrador`.
6. **Entrega con `/entregar`:** PR titulado `Borrador OT-XX: <tema>`. **No ejecutes la OT** hasta que el dueño la apruebe y quede `lista`.
7. **No inventes decisiones de negocio:** precios, textos al cliente, gasto en anuncios. Déjalas como preguntas en "Precondiciones del dueño".
