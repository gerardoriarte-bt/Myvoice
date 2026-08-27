import React from 'react';
import { ContentDNAProfile, Client, FunnelStage } from '../types';

interface PromptPreviewProps {
  client?: Client | null;
  draft: Partial<Pick<ContentDNAProfile,
    'name' | 'campaignConcept' | 'voice' | 'goal' | 'product' | 'targetAudience'
    | 'theme' | 'keywords' | 'prohibitions' | 'brandVoiceGuidelines'
    | 'valueProposition' | 'primaryCTA' | 'feedbackExamples'
  >>;
  funnelStage?: FunnelStage;
}

const FUNNEL_HINT: Record<FunnelStage, string> = {
  [FunnelStage.AWARENESS]:
    "Awareness (TOFU) — el público todavía NO conoce la marca o el problema. Los ángulos deben EDUCAR o REVELAR.",
  [FunnelStage.CONSIDERATION]:
    "Consideración (MOFU) — el público compara opciones. Los ángulos deben DIFERENCIAR vs. competidores.",
  [FunnelStage.CONVERSION]:
    "Conversión (BOFU) — el público está listo. Los ángulos deben EMPUJAR la decisión.",
  [FunnelStage.RETENTION]:
    "Retención — el cliente ya compró. Los ángulos deben REFORZAR la decisión y abrir cross-sell."
};

const placeholder = (v?: string) => (v && v.trim() ? v.trim() : '—');

const buildPreview = (
  client: Client | null | undefined,
  d: PromptPreviewProps['draft'],
  funnelStage?: FunnelStage
): { system: string; user: string } => {
  const clientName = client?.name || '{cliente}';
  const voice = d.voice || client?.voice || '';
  const valueProposition = d.valueProposition || client?.valueProposition || '';
  const guidelines = d.brandVoiceGuidelines || client?.brandVoiceGuidelines || '';
  const concept = (d.campaignConcept || '').trim();

  const conceptBlock = concept
    ? `## CONCEPTO DE CAMPAÑA — ANCLAJE INAMOVIBLE
"${concept}"

Este concepto ya fue decidido por el equipo creativo. Lo vas a usar TEXTUALMENTE como valor del campo "concept" en tu respuesta — sin reformular, sin reemplazar, sin "mejorarlo".
Tu trabajo es derivar keyMessage / tone / heroCTA / angles que SOSTENGAN este concepto en todos los canales.`
    : `## CONCEPTO DE CAMPAÑA
No fue provisto. Derivá un concepto memorable, específico, que pueda funcionar como tagline raíz de toda la campaña.`;

  const stageBlock = funnelStage
    ? `## ETAPA DEL FUNNEL: ${funnelStage}
${FUNNEL_HINT[funnelStage]}`
    : '';

  const system = `Sos director de campaña — estratega senior con 15 años en agencia, no copywriter.
Tu trabajo NO es escribir copy: es decidir el anclaje creativo que mantendrá una campaña coherente entre canales.

TEST OBLIGATORIO antes de responder: ¿esta espina aplicaría a cualquier marca del mismo rubro, o se siente inconfundiblemente de ESTA marca? Si es lo primero, reformulá hasta que sea lo segundo.

Respondés SOLO en JSON válido. Sin texto fuera del JSON. Sin comentarios.`;

  const user = `${conceptBlock}

${stageBlock}

## ADN DE MARCA
- Propuesta de valor: ${placeholder(valueProposition)}
- Voz: ${placeholder(voice)}
- Guías de voz: ${placeholder(guidelines)}

## CONTEXTO DE CAMPAÑA
- Marca: ${clientName}
- Producto/Servicio: ${placeholder(d.product)}
- Audiencia: ${placeholder(d.targetAudience)}
- Objetivo táctico: ${placeholder(d.goal)}
- Brief: ${placeholder(d.theme)}
- Keywords (favorecer): ${placeholder(d.keywords)}
- Prohibiciones: ${placeholder(d.prohibitions)}
- CTA solicitado: ${placeholder(d.primaryCTA)}

---

## TAREA
Devolvé un JSON con la espina de la campaña.

REGLAS DE LOS 3 ÁNGULOS:
1. Sustantivamente distintos — 3 estrategias, no 3 redacciones del mismo brief.
2. Cada uno declara su propia premisa narrativa.
3. Nombres pueden alejarse de Beneficio/Curiosidad/Urgencia si otra etiqueta describe mejor.
4. El "register" debe ser concreto: ritmo, persona gramatical, tipo de frase.

REGLAS DE FILTRO:
- Si concept / keyMessage / tone podrían aplicar a otra marca → reformular.
- Si el equipo proveyó concept, va TEXTUAL en la respuesta.
- keyMessage ≠ concept: el keyMessage es lo que el público se LLEVA.

## FORMATO JSON
{
  "concept": "string (≤12 palabras)",
  "keyMessage": "string",
  "tone": "string específico",
  "heroCTA": "string",
  "angles": [
    { "name": "string", "premise": "string", "register": "string" },
    { "name": "string", "premise": "string", "register": "string" },
    { "name": "string", "premise": "string", "register": "string" }
  ]
}`;

  return { system, user };
};

const PromptPreview: React.FC<PromptPreviewProps> = ({ client, draft, funnelStage }) => {
  const { system, user } = React.useMemo(
    () => buildPreview(client, draft, funnelStage),
    [client, draft, funnelStage]
  );
  const text = `# SYSTEM\n${system}\n\n---\n\n# USER\n${user}`;
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API might be unavailable; fail silently.
    }
  };

  return (
    <div className="bg-ink rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-ink">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-medium text-gray-300 uppercase tracking-wider">
            Director Prompt — vista en vivo
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="text-[11px] font-medium text-gray-400 hover:text-white transition-colors"
        >
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="flex-1 overflow-auto px-4 py-3 text-[11.5px] leading-relaxed text-gray-200 font-mono whitespace-pre-wrap custom-scrollbar">
        {text}
      </pre>
      <div className="px-4 py-2 border-t border-gray-800 bg-gray-950 text-[10px] text-gray-500 leading-snug">
        Este es el prompt del <strong className="text-gray-300">director</strong> (capa 1). Cada canal seleccionado recibe además su propio prompt especialista derivado de la espina que el director devuelve.
      </div>
    </div>
  );
};

export default PromptPreview;
