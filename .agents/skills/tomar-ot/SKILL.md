---
name: tomar-ot
description: "Toma y ejecuta la siguiente orden de trabajo (OT) de tu frente según planes/README.md: sincroniza, crea la rama, presenta el plan, ejecuta con pruebas, deja evidencia, llena el reporte y entrega con PR. Úsala al empezar a trabajar o cuando el usuario diga 'siguiente tarea', 'toma la OT' o /tomar-ot."
---

# /tomar-ot

1. **Tu frente:** `git config user.name` → `https-JosephJoestar` = Frente A · `Vrydie` = Frente B (AGENTS.md §11). Si no coincide con ninguno, detente y pide configurarlo.
2. **Sincroniza** siguiendo `/sincronizar`.
3. **Lee** `AGENTS.md` completo, `COLABORACION.md` y `planes/README.md`.
4. **Elige** la primera OT de tu frente en estado `lista` cuyas dependencias estén `cerradas`.
   - **Ninguna disponible, Frente B:** ofrece `/redactar-ot`.
   - **Ninguna disponible, Frente A:** avisa al dueño para que Claude prepare la siguiente.
5. **Rama:** `git switch -c <a|b>/ot-XX-<slug> origin/main`. Marca la OT como `en curso`, en la OT y en la cola.
6. **Lee la OT completa** y sus lecturas obligatorias. Revisa las precondiciones:
   - Si falta algo del dueño: marca `bloqueada`, escribe exactamente qué falta, entrega con `/entregar` y **detente**.
7. **Presenta el plan** al usuario: pasos, archivos que vas a tocar y comandos que cambian cosas. **Espera su OK** antes de ejecutar esos comandos.
8. **Ejecuta paso a paso:**
   - Prueba primero con los payloads de `schemas/`, antes de conectar servicios reales.
   - Guarda la evidencia en `planes/evidencia/OT-XX/`: salidas recortadas y capturas, **sin secretos**.
   - Si algo del plan no se puede hacer como está escrito, **no improvises en silencio**: anótalo como desvío en el reporte y, si cambia el resultado, pregunta.
9. **Reporte:** llena "Reporte de ejecución" en la OT y cambia el estado a `para revisión`, en la OT y en la cola.
10. **Entrega** con `/entregar`. **Nunca marques una OT como `cerrada`:** eso lo hace quien revisa.

**Reglas que no se saltan:** solo tocas carpetas de tu frente (`COLABORACION.md` §2). Los gates bloqueantes de la OT detienen el trabajo hasta la aprobación. Todo lo de `AGENTS.md` aplica.
