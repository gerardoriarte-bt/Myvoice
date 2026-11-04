"""Regla de fronteras entre módulos, para CI.

Uso:
    python3 -I scripts/mapa/fronteras.py

Lee los imports de cada .ts/.tsx del repositorio (sin Graphify: solo la biblioteca estándar, para que
CI no descargue nada), los asigna a su módulo con scripts/mapa/modulos.json y los clasifica con la
misma regla que el mapa (`clase` de dependencias.py). Falla si alguno está en «hay que invertir» o si
un archivo no tiene módulo. Lo que pasa por el contrato solo se cuenta: todavía está permitido.

El mapa (`npm run mapa`) sigue siendo la medición completa, con llamadas y tipos; esto es el piso
que no se puede romper.
"""
import json
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from dependencias import clase, modulo_de, NOMBRE  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(AQUI))
IGNORAR = {"node_modules", "dist", ".git", ".graphify", "uploads", ".calidad"}
IMPORT = re.compile(
    r"""(?:^|[\s;])(?:import|export)\s[^'"]*?\sfrom\s*['"]([^'"]+)['"]"""
    r"""|(?:^|[\s;])import\s*['"]([^'"]+)['"]"""
    r"""|\bimport\(\s*['"]([^'"]+)['"]\s*\)""",
    re.M,
)


def archivos():
    for base, dirs, nombres in os.walk(RAIZ):
        dirs[:] = [d for d in dirs if d not in IGNORAR and not d.startswith(".")]
        for n in nombres:
            if n.endswith((".ts", ".tsx")) and not n.endswith(".d.ts"):
                yield os.path.relpath(os.path.join(base, n), RAIZ)


def resolver(desde, especificador):
    """El archivo del repositorio que importa `especificador`, o None si es un paquete."""
    if not especificador.startswith("."):
        return None
    base = os.path.normpath(os.path.join(os.path.dirname(desde), especificador))
    sin_ext = re.sub(r"\.(js|jsx|ts|tsx)$", "", base)
    for candidato in (base, sin_ext + ".ts", sin_ext + ".tsx", os.path.join(sin_ext, "index.ts"),
                      os.path.join(sin_ext, "index.tsx")):
        if os.path.isfile(os.path.join(RAIZ, candidato)):
            return candidato
    return None


def main():
    reglas = json.load(open(os.path.join(AQUI, "modulos.json"), encoding="utf-8"))["reglas"]
    invertir, contrato, sin_modulo = [], 0, set()
    for a in archivos():
        ma = modulo_de(a, reglas)
        if ma is None:
            sin_modulo.add(a)
            continue
        if ma == "fuera":
            continue
        texto = open(os.path.join(RAIZ, a), encoding="utf-8").read()
        for m in IMPORT.finditer(texto):
            b = resolver(a, next(g for g in m.groups() if g))
            if not b:
                continue
            mb = modulo_de(b, reglas)
            if mb is None:
                sin_modulo.add(b)
                continue
            if mb == ma or mb == "fuera":
                continue
            c = clase(ma, mb)
            if c == "invertir":
                invertir.append((a, ma, b, mb))
            elif c == "contrato":
                contrato += 1

    for a, ma, b, mb in sorted(set(invertir)):
        print(f"✗ {a} ({NOMBRE[ma]}) importa {b} ({NOMBRE[mb]})")
    for f in sorted(sin_modulo):
        print(f"✗ {f} no tiene módulo: agregá una regla en scripts/mapa/modulos.json")
    print(f"Fronteras: invertir {len(set(invertir))} · sin módulo {len(sin_modulo)} · "
          f"imports que pasarán por el contrato {contrato}")
    if invertir or sin_modulo:
        print("Ver docs/ecosistema/tecnico/spec-plataforma.md § 2.1 para cómo se resuelve cada caso.")
        sys.exit(1)


if __name__ == "__main__":
    main()
