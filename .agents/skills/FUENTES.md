# Fuentes de las skills del proyecto

Copias fijadas a un commit exacto. Para actualizar una skill: clonar en `.cache/skills-src/`, revisar los cambios, copiar solo la carpeta de la skill y actualizar esta tabla.

| Skill | Repositorio | Commit | Licencia | Notas |
|---|---|---|---|---|
| `shopify` | https://github.com/Shopify/Shopify-AI-Toolkit | `3e8a074fba02d9b95086ad505f8cbe0020ffeb9a` | MIT (`shopify/LICENSE`) | Sus scripts envían telemetría a shopify.dev: usar con `OPT_OUT_INSTRUMENTATION=true` |
| `frontend-design` | https://github.com/anthropics/skills | `33375500bcea98d610eb30ce10ac4e59b89c390d` | Apache 2.0 (`frontend-design/LICENSE.txt`) | Solo instrucciones |
| `cro`, `copywriting` | https://github.com/coreyhaines31/marketingskills | `5b2c0007766c6a1cf1d53fd8fc73e979e0821022` | MIT (`cro/LICENSE`, `copywriting/LICENSE`) | Solo markdown |
| `ui-ux-pro-max` | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | `823b0a14d3539b5d78c0efb614426a4fab5983ec` | MIT (`ui-ux-pro-max/LICENSE`) | Librería de consulta; ver abajo |
| `diseno-visual` | propia del proyecto | — | — | Puerta de entrada para todo el trabajo visual |

## Adaptación de ui-ux-pro-max al proyecto (26-sep-2026)
- `ui-ux-pro-max/SKILL.md` se renombró a `SKILL.upstream.md`: queda como **librería de consulta** (datos + buscador), no como skill autónoma. Su flujo exige `--design-system` y usa rutas `${CLAUDE_PLUGIN_ROOT}` que aquí no existen.
- La skill del proyecto **`diseno-visual/`** define el orden de autoridad, qué usar y qué no, las consultas útiles, la traducción a Horizon y el checklist. Su buscador `scripts/buscar.sh` es de solo lectura.
- Está enlazada para Claude Code en `.claude/skills/diseno-visual` (symlink).
- Auditoría de scripts: solo biblioteca estándar de Python, sin red ni subprocesos. Solo `design_system.py` escribe archivos, y únicamente con `--persist` (bloqueado).
- Scripts aprobados por el dueño solo para búsqueda de lectura: `search.py`, `core.py`, `design_system.py` (sin `--persist`) y `reasoning_contract.py`.
