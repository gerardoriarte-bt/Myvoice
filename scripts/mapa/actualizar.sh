#!/usr/bin/env bash
# Regenera el mapa del código y la lista de dependencias entre módulos.
#
# Se corre al cerrar cada sesión, antes de escribir la bitácora (docs/ecosistema/bitacora/).
# Todo es local: Graphify lee el código con tree-sitter, sin IA ni claves
# (GRAPHIFY_BACKEND=none) y sin guardar historial de consultas.
#
# Requiere uv (brew install uv). La versión de Graphify está fijada para que el mapa
# no cambie solo entre corridas.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
SALIDA="$RAIZ/.graphify"
VERSION="0.9.97"

export GRAPHIFY_BACKEND=none GRAPHIFY_QUERY_LOG_DISABLE=1

uvx -q --python 3.12 --from "graphifyy[sql]==$VERSION" \
  graphify extract "$RAIZ" --code-only --out "$SALIDA" --force >/dev/null

cd "$RAIZ"
python3 -I scripts/mapa/dependencias.py \
  "$SALIDA/graphify-out/graph.json" \
  scripts/mapa/modulos.json \
  docs/ecosistema/tecnico/dependencias-entre-modulos.md

uvx -q --python 3.12 --from "graphifyy[sql]==$VERSION" graphify cluster-only "$SALIDA" --no-label >/dev/null
echo "Grafo interactivo: $SALIDA/graphify-out/  (no se versiona)"
