import * as XLSX from 'xlsx';
import { CopyVariation, CampaignSpine, CoherenceReport, UsageReport, Client } from '../types';

interface ExportArgs {
  variations: CopyVariation[];
  spine?: CampaignSpine | null;
  client?: Client;
  coherence?: CoherenceReport | null;
  usage?: UsageReport | null;
  campaignName?: string;
}

const sanitizeSheetName = (name: string): string => {
  // Excel sheet names: max 31 chars, can't contain : \ / ? * [ ]
  return name.replace(/[:\\/?*[\]]/g, '-').slice(0, 31);
};

const slotOrder = ['subject', 'preheader', 'header', 'body', 'cta', 'hook', 'verbalHook', 'caption', 'narrative', 'onScreenText', 'message', 'shortTitle', 'longTitle', 'description', 'title', 'text', 'rejectMicrocopy', 'script', 'production', 'animationBrief', 'visualBrief', 'hashtags', 'swipeCTA', 'slide1Hook', 'slidesBody', 'slideFinalCTA', 'placeholder'];

const slotPriority = (slot: string | undefined): number => {
  if (!slot) return 999;
  const idx = slotOrder.indexOf(slot);
  return idx >= 0 ? idx : 500;
};

const groupByPlatform = (variations: CopyVariation[]): Record<string, CopyVariation[]> => {
  const map: Record<string, CopyVariation[]> = {};
  variations.forEach(v => {
    const key = String(v.platform);
    if (!map[key]) map[key] = [];
    map[key].push(v);
  });
  // Sort each group: by slot priority, then variationIndex
  Object.keys(map).forEach(k => {
    map[k].sort((a, b) => {
      const sa = slotPriority(a.slot);
      const sb = slotPriority(b.slot);
      if (sa !== sb) return sa - sb;
      return (a.variationIndex ?? 0) - (b.variationIndex ?? 0);
    });
  });
  return map;
};

const statusOf = (v: CopyVariation): string => {
  if (v.prohibitionsHit && v.prohibitionsHit.length > 0) return `⚠ Prohibición: ${v.prohibitionsHit.join(', ')}`;
  if (v.budgetOk === false) return '⚠ Excede budget';
  return 'OK';
};

const buildSummarySheet = (args: ExportArgs): any[][] => {
  const { spine, client, coherence, usage, campaignName, variations } = args;
  const rows: any[][] = [];
  const blank = ['', ''];

  rows.push(['CAMPAÑA — RESUMEN EJECUTIVO']);
  rows.push(blank);
  rows.push(['Marca', client?.name || '—']);
  rows.push(['Industria', client?.industry || '—']);
  rows.push(['Campaña', campaignName || '—']);
  rows.push(['Generado', new Date().toLocaleString()]);
  rows.push(blank);

  if (spine) {
    rows.push(['CONCEPTO CREATIVO', spine.concept]);
    rows.push(['Mensaje clave', spine.keyMessage]);
    rows.push(['Tono', spine.tone]);
    rows.push(['Hero CTA', spine.heroCTA]);
    rows.push(blank);
    rows.push(['ÁNGULOS NARRATIVOS']);
    spine.angles.forEach((a, i) => {
      rows.push([`${i + 1}. ${a.name}`, `${a.premise}\nRegistro: ${a.register}`]);
    });
    rows.push(blank);
  }

  // Index of channels
  const byChannel = groupByPlatform(variations);
  rows.push(['CANALES GENERADOS']);
  Object.entries(byChannel).forEach(([ch, items]) => {
    const slotCounts = new Map<string, number>();
    items.forEach(v => {
      const k = v.slot || '_default';
      slotCounts.set(k, (slotCounts.get(k) || 0) + 1);
    });
    const slotsStr = Array.from(slotCounts.entries()).map(([k, n]) => `${k}(${n})`).join(' · ');
    rows.push([ch, `${items.length} piezas — ${slotsStr}`]);
  });
  rows.push(blank);
  rows.push(['Total piezas', variations.length]);
  rows.push(blank);

  if (coherence) {
    rows.push(['COHERENCIA CROSS-CHANNEL', `${coherence.coherenceScore}/10`]);
    rows.push(['Síntesis', coherence.summary]);
    if (coherence.flags.length > 0) rows.push(['Flags', coherence.flags.join(', ')]);
    if (coherence.issues.length > 0) {
      rows.push(blank);
      rows.push(['Issues detectados']);
      coherence.issues.forEach(issue => {
        rows.push([`[${issue.severity.toUpperCase()}] ${issue.channels.join(' ↔ ')}`, issue.problem]);
      });
    }
    rows.push(blank);
  }

  if (usage) {
    rows.push(['COSTO DE GENERACIÓN', `$${usage.costUsd.toFixed(4)} USD`]);
    rows.push(['Tokens input', usage.promptTokens]);
    rows.push(['Tokens output', usage.completionTokens]);
    rows.push(['Tokens cacheados', `${usage.cachedTokens} (${usage.promptTokens > 0 ? Math.round((usage.cachedTokens / usage.promptTokens) * 100) : 0}%)`]);
  }

  return rows;
};

const buildChannelSheet = (
  platform: string,
  items: CopyVariation[],
  spine?: CampaignSpine | null
): any[][] => {
  const rows: any[][] = [];

  if (spine) {
    rows.push([`CANAL: ${platform}`]);
    rows.push([]);
    rows.push(['Concepto', spine.concept]);
    rows.push(['Tono', spine.tone]);
    rows.push(['Hero CTA', spine.heroCTA]);
    rows.push([]);
  }

  rows.push(['Slot', '#', 'Tipo / Ángulo', 'Contenido', 'Chars/Pal', 'Budget', 'Status', 'Score', 'Comentario editor', 'Flags', 'Auto-fix']);

  let lastSlot: string | undefined = '__init__';
  items.forEach(v => {
    if (v.slot !== lastSlot) {
      // Visual separator: blank row before new slot group (skip first)
      if (lastSlot !== '__init__') rows.push([]);
      lastSlot = v.slot;
    }
    rows.push([
      v.slot || '—',
      v.variationIndex ?? '',
      v.type,
      v.content,
      v.charCount,
      v.budget ?? '',
      statusOf(v),
      v.score ?? '',
      v.scoreRationale ?? '',
      (v.editorFlags || []).join(', '),
      v.autofixed ? 'Sí' : '',
    ]);
  });

  return rows;
};

export const exportCampaignToExcel = (args: ExportArgs): void => {
  const wb = XLSX.utils.book_new();

  // === SHEET 1: Resumen ===
  const summaryRows = buildSummarySheet(args);
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1['!cols'] = [{ wch: 28 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

  // === SHEETS 2..N: Per channel ===
  const byChannel = groupByPlatform(args.variations);
  Object.entries(byChannel).forEach(([platform, items]) => {
    const rows = buildChannelSheet(platform, items, args.spine);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 14 },  // slot
      { wch: 4 },   // #
      { wch: 22 },  // tipo
      { wch: 75 },  // contenido
      { wch: 9 },   // chars
      { wch: 9 },   // budget
      { wch: 22 },  // status
      { wch: 6 },   // score
      { wch: 50 },  // comentario editor
      { wch: 22 },  // flags
      { wch: 9 },   // autofix
    ];
    // Make content cells wrap
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let r = range.s.r; r <= range.e.r; ++r) {
      const cellRef = XLSX.utils.encode_cell({ r, c: 3 }); // Contenido column
      if (ws[cellRef] && ws[cellRef].v) {
        ws[cellRef].s = { alignment: { wrapText: true, vertical: 'top' } };
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(platform));
  });

  // === Filename ===
  const safe = (args.client?.name || 'campaña').replace(/[^\w-]+/g, '_');
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${safe}_${date}.xlsx`;

  XLSX.writeFile(wb, filename);
};
