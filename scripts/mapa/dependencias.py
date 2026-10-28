"""Dependencias entre módulos, leídas del grafo de Graphify.

Uso (lo llama scripts/mapa/actualizar.sh):
    python3 -I scripts/mapa/dependencias.py <graph.json> <modulos.json> <salida.md>

Solo usa la biblioteca estándar. Lee el grafo que Graphify arma del código (sin IA) y escribe un
markdown con cada dependencia que cruza de un módulo a otro, clasificada según la decisión 12:
lo que hay que invertir, lo que debe pasar por el contrato y lo que está permitido.
"""
import json
import subprocess
import sys
from collections import defaultdict
from datetime import date

RELACIONES = {"imports", "imports_from", "calls", "references", "inherits", "indirect_call"}
ORDEN = ["plataforma", "comun", "myvoice", "cdm", "compartido"]
NOMBRE = {"plataforma": "Plataforma", "comun": "Parte común", "myvoice": "My Voice",
          "cdm": "CDM", "compartido": "Compartido"}


def modulo_de(archivo, reglas):
    mejor = None
    for prefijo, modulo in reglas.items():
        if archivo == prefijo or (prefijo.endswith("/") and archivo.startswith(prefijo)):
            if mejor is None or len(prefijo) > len(mejor[0]):
                mejor = (prefijo, modulo)
    return mejor[1] if mejor else None


def clase(origen, destino):
    """Qué significa que `origen` dependa de `destino`."""
    if origen == "plataforma" or destino == "compartido":
        return "permitida"
    if origen == "compartido":
        return "invertir"  # la infraestructura no puede depender de un módulo
    if destino == "plataforma":
        return "invertir"  # nadie depende del arranque
    if origen in ("myvoice", "cdm") and destino == "comun":
        return "contrato"  # un módulo lee la parte común solo por contrato/
    return "invertir"      # la parte común no depende de un módulo, ni un módulo de otro


def main(grafo_path, modulos_path, salida_path):
    grafo = json.load(open(grafo_path, encoding="utf-8"))
    reglas = {k: v for k, v in json.load(open(modulos_path, encoding="utf-8"))["reglas"].items()}
    archivo_de = {n["id"]: n.get("source_file") for n in grafo["nodes"]}
    etiqueta = {n["id"]: n.get("label", n["id"]) for n in grafo["nodes"]}

    pares = defaultdict(lambda: {"rel": defaultdict(int), "simbolos": set()})
    sin_modulo = set()
    for l in grafo["links"]:
        if l.get("relation") not in RELACIONES:
            continue
        a, b = archivo_de.get(l["source"]), archivo_de.get(l["target"])
        if not a or not b or a == b:
            continue
        ma, mb = modulo_de(a, reglas), modulo_de(b, reglas)
        for f, m in ((a, ma), (b, mb)):
            if m is None:
                sin_modulo.add(f)
        if not ma or not mb or ma == mb or "fuera" in (ma, mb):
            continue
        p = pares[(ma, mb, a, b)]
        p["rel"][l["relation"]] += 1
        p["simbolos"].add(etiqueta.get(l["target"], ""))

    try:
        commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True,
                                text=True).stdout.strip()
    except OSError:
        commit = "?"

    por_clase = defaultdict(list)
    matriz = defaultdict(int)
    for (ma, mb, a, b), p in pares.items():
        por_clase[clase(ma, mb)].append((ma, mb, a, b, p))
        matriz[(ma, mb)] += 1

    o = []
    o.append("# Dependencias entre módulos (generado)\n")
    o.append(f"Generado el {date.today().isoformat()} desde el commit `{commit}` con "
             "`bash scripts/mapa/actualizar.sh`. **No se edita a mano**: se corrige "
             "`scripts/mapa/modulos.json` y se vuelve a generar.\n")
    o.append("Cada fila es un archivo que usa algo de otro archivo de **otro módulo** (importa, llama o "
             "referencia un tipo). Módulos según la decisión 12; reglas en "
             "[spec-plataforma.md](./spec-plataforma.md) § 2.\n")
    o.append("## Resumen: pares de archivos que cruzan\n")
    o.append("| Desde \\ Hacia | " + " | ".join(NOMBRE[m] for m in ORDEN) + " |")
    o.append("|---|" + "---|" * len(ORDEN))
    for ma in ORDEN:
        fila = [str(matriz[(ma, mb)]) if matriz[(ma, mb)] else "·" for mb in ORDEN]
        o.append(f"| **{NOMBRE[ma]}** | " + " | ".join(fila) + " |")
    o.append("")
    o.append(f"- **Hay que invertir**: {len(por_clase['invertir'])} · "
             f"**pasan por el contrato**: {len(por_clase['contrato'])} · "
             f"**permitidas**: {len(por_clase['permitida'])}\n")

    titulos = {
        "invertir": ("Hay que invertir",
                     "Rompen la regla: la parte común o la infraestructura dependen de un módulo, o un "
                     "módulo depende de otro. Antes de partir las carpetas, cada una se resuelve moviendo "
                     "el archivo de módulo, moviendo el tipo a `contrato/`, o invirtiendo la llamada "
                     "(el módulo se registra en la parte común en vez de que la parte común lo importe)."),
        "contrato": ("Pasan por el contrato",
                     "Un módulo lee la parte común. Está bien, pero solo por `contrato/`: esta lista es lo "
                     "que `contrato/` tiene que exponer."),
        "permitida": ("Permitidas",
                      "El arranque importa de todos, y todos usan la infraestructura compartida."),
    }
    for c in ("invertir", "contrato", "permitida"):
        filas = sorted(por_clase[c])
        t, d = titulos[c]
        o.append(f"## {t} ({len(filas)})\n")
        o.append(d + "\n")
        if not filas:
            o.append("Ninguna.\n")
            continue
        if c == "permitida":
            o.append("| Desde | Hacia | Pares |")
            o.append("|---|---|---|")
            for (ma, mb), n in sorted(((k, v) for k, v in matriz.items() if v and clase(*k) == c)):
                o.append(f"| {NOMBRE[ma]} | {NOMBRE[mb]} | {n} |")
            o.append("")
            continue
        o.append("| Desde | Archivo | Hacia | Archivo | Qué usa |")
        o.append("|---|---|---|---|---|")
        for ma, mb, a, b, p in filas:
            simbolos = ", ".join(sorted(s for s in p["simbolos"] if s)[:4])
            o.append(f"| {NOMBRE[ma]} | `{a}` | {NOMBRE[mb]} | `{b}` | {simbolos} |")
        o.append("")
    if sin_modulo:
        o.append(f"## Archivos sin módulo ({len(sin_modulo)})\n")
        o.append("Agregar una regla en `scripts/mapa/modulos.json`.\n")
        for f in sorted(sin_modulo):
            o.append(f"- `{f}`")
        o.append("")
    open(salida_path, "w", encoding="utf-8").write("\n".join(o))
    print(f"{salida_path}: invertir {len(por_clase['invertir'])}, contrato "
          f"{len(por_clase['contrato'])}, permitidas {len(por_clase['permitida'])}, "
          f"sin módulo {len(sin_modulo)}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
