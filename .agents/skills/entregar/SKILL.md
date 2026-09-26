---
name: entregar
description: "Entrega el trabajo de la rama actual: revisa secretos y carpetas del frente, hace commit, sube la rama y abre el pull request con evidencia. Úsala al terminar una tarea u OT, o cuando el usuario diga 'entrega', 'sube los cambios', 'haz el PR' o /entregar. Nunca sube directo a main."
---

# /entregar

1. **Nunca en `main`.** Si estás en `main`, crea antes una rama `a/<tema>` o `b/<tema>` según tu frente (ver `COLABORACION.md`) y mueve ahí los cambios.
2. **Revisión automática:**
   ```bash
   bash .agents/skills/entregar/scripts/revisar.sh
   ```
   - **Sale con error (1):**
     - Secreto: quítalo del código y léelo de `infra/.env`.
     - Archivo del otro frente: reviértelo con `git checkout origin/main -- <archivo>`.
     - Repite la revisión hasta que diga `OK`.
   - **Error 2:** falta configurar `git config user.name`. Pídeselo al usuario.
   - **AVISO de archivos compartidos:** no bloquea, pero el PR debe decirlo y esperar la aprobación del otro frente.
3. **Commit** en español, con la OT al inicio:
   ```bash
   git add -A
   git commit -m "OT-XX: <resumen corto>" -m "- <cambio 1>" -m "- <cambio 2>"
   ```
4. **Subir la rama:** `git push -u origin <rama>`.
5. **Abrir el PR** (si `gh` está instalado):
   ```bash
   gh pr create --base main --title "OT-XX: <resumen>" --body "<cuerpo>"
   ```
   El cuerpo lleva:
   - Qué se hizo.
   - Evidencia: salidas de prueba recortadas y capturas en `planes/evidencia/OT-XX/`.
   - Qué NO se probó.
   - Archivos compartidos tocados, si los hay.
   - Enlace a la sección "Reporte de ejecución" de la OT.

   Sin `gh`, dale al usuario el enlace que imprime `git push`.
6. **Quién une el PR:**
   - **PR de avance** (no entrega una OT) con solo archivos de tu frente: puedes unirlo tú con `gh pr merge --squash --delete-branch`, **si el usuario está de acuerdo**.
   - **PR que entrega una OT** (estado `para revisión`) o que toca archivos compartidos: **no lo unas**. Lo revisa el dueño (Frente B) o Claude (Frente A).
7. Termina con un resumen para el usuario: rama, enlace del PR, qué falta y quién debe revisar.
