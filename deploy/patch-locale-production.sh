#!/usr/bin/env bash
# Parche de variantes de español en el backend de producción (/opt/myvoice/server)
set -euo pipefail

cd /opt/myvoice/server/src

python3 <<'PY'
from pathlib import Path

# --- directorService ---
p = Path("services/directorService.ts")
t = p.read_text()

old_funnel = """const FUNNEL_GUIDANCE: Record<FunnelStage, string> = {
  [FunnelStage.AWARENESS]:
    "Awareness (TOFU) — el público todavía NO conoce la marca o el problema. Los ángulos deben EDUCAR o REVELAR. Evitar CTAs de compra directa; preferir 'descubrí', 'mirá esto', 'sabías que…'. Tono curioso, casi periodístico.",
  [FunnelStage.CONSIDERATION]:
    "Consideración (MOFU) — el público conoce el problema y compara opciones. Los ángulos deben DIFERENCIAR vs. competidores y reforzar prueba (testimonios, datos). CTAs intermedios: 'comparalo', 'simulá', 'probalo gratis'.",
  [FunnelStage.CONVERSION]:
    "Conversión (BOFU) — el público está listo para decidir. Los ángulos deben EMPUJAR la decisión: urgencia real, manejo de objeción final, garantía. CTAs de cierre: 'comprá ahora', 'aprovechá', 'reservá'.",
  [FunnelStage.RETENTION]:
    "Retención (post-compra) — el cliente ya compró. Los ángulos deben REFORZAR la decisión, premiar fidelidad, abrir cross-sell. CTAs blandos: 'descubrí lo nuevo', 'gracias por confiar'."
};"""

new_funnel = """const FUNNEL_GUIDANCE: Record<FunnelStage, string> = {
  [FunnelStage.AWARENESS]:
    "Awareness (TOFU) — el público todavía NO conoce la marca o el problema. Los ángulos deben EDUCAR o REVELAR. Evitar CTAs de compra directa; preferir 'descubre', 'mira esto', '¿sabías que…?'. Tono curioso, casi periodístico.",
  [FunnelStage.CONSIDERATION]:
    "Consideración (MOFU) — el público conoce el problema y compara opciones. Los ángulos deben DIFERENCIAR vs. competidores y reforzar prueba (testimonios, datos). CTAs intermedios: 'compara', 'simula', 'pruébalo gratis'.",
  [FunnelStage.CONVERSION]:
    "Conversión (BOFU) — el público está listo para decidir. Los ángulos deben EMPUJAR la decisión: urgencia real, manejo de objeción final, garantía. CTAs de cierre: 'compra ahora', 'aprovecha', 'reserva'.",
  [FunnelStage.RETENTION]:
    "Retención (post-compra) — el cliente ya compró. Los ángulos deben REFORZAR la decisión, premiar fidelidad, abrir cross-sell. CTAs blandos: 'descubre lo nuevo', 'gracias por confiar'."
};"""

if old_funnel not in t:
    raise SystemExit("directorService: FUNNEL_GUIDANCE block not found")
t = t.replace(old_funnel, new_funnel)

if "localeRules.js" not in t:
    t = t.replace(
        'import { UsageEntry, extractUsage } from "./pricing.js";',
        'import { UsageEntry, extractUsage } from "./pricing.js";\nimport { buildLocaleRulesBlock, resolveMarketLocale } from "./localeRules.js";',
    )

old_system = """const SYSTEM_PROMPT = `
Sos director de campaña — estratega senior con 15 años en agencia, no copywriter.
Tu trabajo NO es escribir copy: es decidir el anclaje creativo que mantendrá una campaña coherente entre canales.

TEST OBLIGATORIO antes de responder: ¿esta espina aplicaría a cualquier marca del mismo rubro, o se siente inconfundiblemente de ESTA marca? Si es lo primero, reformulá hasta que sea lo segundo.

Respondés SOLO en JSON válido. Sin texto fuera del JSON. Sin comentarios.
`.trim();"""

new_system = """const buildDirectorSystemPrompt = (params: CopyParameters) => `
Eres director de campaña — estratega senior con 15 años en agencia, no copywriter.
Tu trabajo NO es escribir copy: es decidir el anclaje creativo que mantendrá una campaña coherente entre canales.
${buildLocaleRulesBlock(resolveMarketLocale(params))}

TEST OBLIGATORIO antes de responder: ¿esta espina aplicaría a cualquier marca del mismo rubro, o se siente inconfundiblemente de ESTA marca? Si es lo primero, reformula hasta que sea lo segundo.

Respondes SOLO en JSON válido. Sin texto fuera del JSON. Sin comentarios.
`.trim();"""

if old_system not in t:
    raise SystemExit("directorService: SYSTEM_PROMPT block not found")
t = t.replace(old_system, new_system)
t = t.replace("No fue provisto. Derivá un concepto", "No fue provisto. Deriva un concepto")
t = t.replace("Devolvé un JSON", "Devuelve un JSON")
t = t.replace('{ role: "system", content: SYSTEM_PROMPT }', '{ role: "system", content: buildDirectorSystemPrompt(params) }')
t = t.replace("system: SYSTEM_PROMPT,", "system: buildDirectorSystemPrompt(params),")
p.write_text(t)
print("OK directorService")

# --- promptBuilder ---
pb = Path("channels/promptBuilder.ts")
pt = pb.read_text()
pt = pt.replace("descartá y reescribí", "descarta y reescribe")
pb.write_text(pt)
print("OK promptBuilder")

# --- otros servicios: Sos -> Eres, imperativo rioplatense en system ---
replacements = [
    ("Sos lingüista de marca. Analizá", "Eres lingüista de marca. Analiza"),
    ("Sos lingüista de marca. Tu output", "Eres lingüista de marca. Tu output"),
    ("Sos director creativo. Tu trabajo", "Eres director creativo. Tu trabajo"),
    ("Sos director creativo senior. Auditás", "Eres director creativo senior. Auditas"),
    ("Sos editor senior de marca. Tu trabajo", "Eres editor senior de marca. Tu trabajo"),
    ("Sos editor senior de marca. Severo", "Eres editor senior de marca. Severo"),
    ("Sos editor de copy. Una variación", "Eres editor de copy. Una variación"),
    ("Sos editor de copy especializado", "Eres editor de copy especializado"),
    ("Sos un analista de marca. Recibís", "Eres un analista de marca. Recibes"),
    ("Sos un analista de marca. Extraés", "Eres un analista de marca. Extraes"),
    ('"2da informal — \'vos sabés\'"', '"2da informal — tú/usted según marca"'),
]

for rel in [
    "services/criticService.ts",
    "services/superCriticService.ts",
    "services/fixerService.ts",
    "services/brandExtractionService.ts",
    "services/voiceFingerprintService.ts",
]:
    fp = Path(rel)
    s = fp.read_text()
    for old, new in replacements:
        s = s.replace(old, new)
    s = s.replace("debés", "debes")
    fp.write_text(s)
    print(f"OK {rel}")
PY

# generateController: pasar clientIndustry para inferir locale
if ! grep -q "clientIndustry: client.industry" controllers/generateController.ts; then
  sed -i 's/clientName: client.name,/clientName: client.name,\n      clientIndustry: client.industry,/' controllers/generateController.ts
  echo "OK generateController clientIndustry"
fi

echo "Patch completo."
