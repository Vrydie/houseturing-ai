---
name: sincronizar
description: "Trae los cambios nuevos de GitHub (main) a tu copia y a tu rama sin pisar el trabajo del otro frente. Úsala al empezar el día, antes de /tomar-ot, o cuando el usuario diga 'actualiza', 'trae lo último' o /sincronizar."
---

# /sincronizar

1. **`git status`.** Si hay cambios sin commit, pregunta al usuario:
   - guardarlos en su rama con un commit de avance, o
   - apartarlos con `git stash`.

   Nunca los borres.
2. **`git fetch origin`.**
3. **En `main`:** `git pull --ff-only`. Si falla, hay commits locales en `main` que no deberían estar: detente y explícaselo al usuario.
4. **En una rama propia:** `git rebase origin/main`.
   - **Conflicto en archivos de tu frente:** resuélvelo conservando la intención de ambos lados y explica qué hiciste.
   - **Conflicto en archivos compartidos o del otro frente:** detente (`git rebase --abort`), explica el conflicto y pregunta.
   - Después del rebase, si la rama ya estaba en GitHub: `git push --force-with-lease`. **Nunca** fuerces `main`.
5. **Resume lo que llegó de `main`:** `git log --oneline ORIG_HEAD..HEAD` o el rango equivalente. Resalta cambios en `AGENTS.md`, `planes/README.md` y `schemas/`.
6. **Frente B:** si llegaron migraciones nuevas en `db/migrations/`, recuerda aplicarlas a la base local (ver `db/migrations/README.md`).
