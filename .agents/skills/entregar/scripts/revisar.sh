#!/usr/bin/env bash
# Revisión previa a /entregar: secretos, archivos .env y carpetas del frente.
# Salida 0 = se puede entregar (puede haber avisos). Salida 1 = hay que corregir. Salida 2 = identidad sin configurar.
set -uo pipefail

root=$(git rev-parse --show-toplevel) || exit 1
cd "$root"

usuario=$(git config user.name || true)
case "$usuario" in
  https-JosephJoestar) frente=A ;;
  Vrydie)              frente=B ;;
  *) echo "No sé a qué frente pertenece '$usuario'. Configura git config user.name (ver COLABORACION.md §6)." >&2; exit 2 ;;
esac

git fetch -q origin 2>/dev/null || true
base=$(git merge-base HEAD origin/main 2>/dev/null || git rev-parse HEAD)
mapfile -t archivos < <( { git diff --name-only "$base"; git diff --name-only --cached; git ls-files --others --exclude-standard; } | sort -u )

if [ "${#archivos[@]}" -eq 0 ]; then
  echo "No hay cambios para entregar."
  exit 0
fi

clasificar() {
  local f="$1"
  case "$f" in
    planes/OT-*.md)
      if   grep -qE '\*\*Frente:\*\* A' "$f" 2>/dev/null; then echo A
      elif grep -qE '\*\*Frente:\*\* B' "$f" 2>/dev/null; then echo B
      else echo C; fi ;;
    tienda/*|prompts/base_conocimiento_producto.md|prompts/generador_ficha_producto.md|.agents/skills/diseno-visual/*|.claude/*) echo A ;;
    infra/*|workflows/*|tests/*|db/migrations/*|db/seeds/*|planes/evidencia/*|prompts/plantillas_whatsapp.md|prompts/evaluador_productos.md|prompts/emparejador_mercado.md) echo B ;;
    *) echo C ;;
  esac
}

errores=0
propios=(); ajenos=(); compartidos=()
for f in "${archivos[@]}"; do
  case "$(clasificar "$f")" in
    "$frente") propios+=("$f") ;;
    C)         compartidos+=("$f") ;;
    *)         ajenos+=("$f") ;;
  esac
done

echo "Frente: $frente ($usuario) — ${#archivos[@]} archivo(s) cambiado(s)"
echo "  Propios: ${#propios[@]}"

if [ "${#ajenos[@]}" -gt 0 ]; then
  echo "ERROR: archivos del otro frente (revierte o pide al otro que los cambie):"
  printf '    %s\n' "${ajenos[@]}"
  errores=1
fi

if [ "${#compartidos[@]}" -gt 0 ]; then
  echo "AVISO: archivos compartidos (el PR necesita aprobación del otro frente):"
  printf '    %s\n' "${compartidos[@]}"
fi

patron='shpat_[A-Za-z0-9]{10,}|shpss_[A-Za-z0-9]{10,}|shpca_[A-Za-z0-9]{10,}|EAA[A-Za-z0-9]{30,}|AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|[0-9]{8,10}:AA[A-Za-z0-9_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----'
for f in "${archivos[@]}"; do
  [ -f "$f" ] || continue
  case "$f" in
    .env.example) ;;
    .env|*.env|*/.env)
      echo "ERROR: $f es un archivo de secretos y no puede entregarse."; errores=1 ;;
  esac
  if grep -IqE "$patron" "$f" 2>/dev/null; then
    echo "ERROR: posible secreto en $f (usa infra/.env y léelo desde el código)."
    errores=1
  fi
  tam=$(du -k "$f" | cut -f1)
  if [ "$tam" -gt 20480 ]; then
    echo "AVISO: $f pesa $((tam / 1024)) MB. ¿Debe ir al repositorio?"
  fi
done

if [ "$errores" -eq 0 ]; then
  echo "OK: se puede entregar."
fi
exit "$errores"
