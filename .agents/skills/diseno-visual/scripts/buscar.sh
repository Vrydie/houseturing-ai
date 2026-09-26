#!/usr/bin/env bash
# Búsqueda de solo lectura en la base de ui-ux-pro-max.
# Bloquea las opciones que escriben archivos (--persist, --force, --output-dir, --page).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../ui-ux-pro-max/scripts" && pwd)"

for arg in "$@"; do
  case "$arg" in
    --persist|--force|--output-dir|--output-dir=*|-o|--page|--page=*)
      echo "Bloqueado: en este proyecto el buscador es de solo lectura (sin $arg)." >&2
      exit 2
      ;;
  esac
done

exec python3 "$DIR/search.py" "$@"
