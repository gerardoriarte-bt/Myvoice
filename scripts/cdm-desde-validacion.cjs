#!/usr/bin/env node
/**
 * Google y DV360 en la biblioteca de CDM (2026-11-25): convierte la planilla de validación de formatos («CDM -
 * validacion_formatos_medios.xlsx», hoja Formatos, exportada a CSV) en la planilla de medio que carga
 * `npm run cdm:importar`, organizada por pieza a producir (decisión 18), como Meta.
 *
 *   node scripts/cdm-desde-validacion.cjs "<csv>" google > docs/ecosistema/cdm/biblioteca/google-especificaciones-2026-11-25.json
 *   node scripts/cdm-desde-validacion.cjs "<csv>" dv360  > docs/ecosistema/cdm/biblioteca/dv360-especificaciones-2026-11-25.json
 *
 * Lo que entra (Gerardo, 2026-11-25): de Google, Performance Max, Demand Gen, YouTube y Display; de DV360, display,
 * HTML5, rich media, intersticiales, native, video, YouTube y CTV. Los banners, solo los estándar. Lo que no: las
 * filas «Asset», «Feed», «Tag» y «Audio» sin medidas ni textos (son funciones, no piezas), los logos (son de la
 * marca, no se producen por campaña), AMPHTML, las medidas de Polonia y las poco usadas, las reservas (masthead,
 * 60 s), lo dinámico y lo autogenerado. Búsqueda ya está en la biblioteca («Anuncio de búsqueda»). Las reglas están
 * en docs/ecosistema/cdm/biblioteca/google.md. Nada de esto está validado: el equipo lo valida en la Biblioteca.
 */
const fs = require('fs');

const csv = fs.readFileSync(process.argv[2], 'utf8');
const MEDIO = process.argv[3] === 'dv360' ? 'dv360' : 'google';

/** CSV con comillas: lo justo para esta planilla. */
const filas = [];
{
  let fila = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (comillas) {
      if (c === '"' && csv[i + 1] === '"') (campo += '"'), i++;
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') fila.push(campo), (campo = '');
    else if (c === '\n') fila.push(campo), filas.push(fila), (fila = []), (campo = '');
    else if (c !== '\r') campo += c;
  }
  if (campo || fila.length) fila.push(campo), filas.push(fila);
}

const encabezado = filas.findIndex(f => f[0] === 'Check');
const columnas = filas[encabezado];
const datos = filas
  .slice(encabezado + 1)
  .filter(f => f.some(Boolean))
  .map(f => Object.fromEntries(columnas.map((c, i) => [c, (f[i] ?? '').trim()])));

const BANNERS = ['300 x 250', '336 x 280', '728 x 90', '300 x 600', '320 x 50', '320 x 100', '160 x 600', '970 x 250', '468 x 60', '250 x 250'];
const proporciones = r => r.split(',').map(s => s.trim()).filter(Boolean);
const enNombre = r => r.replace('1.91:1', '1,91:1');
const medida = m => m.replace(/\s*x\s*/, '×');

/** Qué pieza y qué ubicación es cada fila; `null` = no entra. */
const reglas = (f, r) => {
  const { Canal: canal, Formato: formato } = f;
  if (canal === 'PMax') {
    if (formato === 'Asset group sin feed: texto') return { pieza: 'Texto PMax', tipo: 'Texto', ubicacion: 'Performance Max · todos los canales' };
    if (formato === 'Imagen asset group') return { pieza: `Imagen ${enNombre(r)}`, tipo: 'Imagen', ubicacion: 'Performance Max' };
    if (formato === 'Video asset group') return { pieza: `Video ${r}`, tipo: 'Video', ubicacion: 'Performance Max' };
    return null;
  }
  if (canal === 'Demand Gen') {
    if (formato === 'Imagen simple') return { pieza: `Imagen ${enNombre(r)}`, tipo: 'Imagen', ubicacion: 'Demand Gen · imagen' };
    if (formato === 'Carrusel') return { pieza: `Carrusel ${enNombre(r)}`, tipo: 'Imagen', ubicacion: 'Demand Gen · carrusel (2 a 10 tarjetas)' };
    if (formato === 'Video') return { pieza: `Video ${r}`, tipo: 'Video', ubicacion: 'Demand Gen · video' };
    if (formato.startsWith('Display subido') && BANNERS.includes(f['Medidas (px)']))
      return { pieza: `Banner ${medida(f['Medidas (px)'])}`, tipo: 'Imagen', ubicacion: 'Demand Gen · display subido' };
    return null;
  }
  if (canal === 'Display') {
    if (formato === 'Responsive Display Ad: imagen') return { pieza: `Imagen ${enNombre(r)}`, tipo: 'Imagen', ubicacion: 'Display responsivo' };
    if (formato === 'Responsive Display Ad: video') return { pieza: `Video ${r}`, tipo: 'Video', ubicacion: 'Display responsivo' };
    const banner = /^Uploaded (image|HTML5) ad \(/.exec(formato);
    if (banner && BANNERS.includes(f['Medidas (px)']))
      return { pieza: `Banner ${medida(f['Medidas (px)'])}`, tipo: 'Imagen', ubicacion: banner[1] === 'image' ? 'Display · imagen subida' : 'Display · HTML5 subido' };
    return null;
  }
  if (canal === 'YouTube') {
    const video = {
      'Skippable in-stream': 'YouTube · in-stream saltable',
      'Non-skippable in-stream 15 s': 'YouTube · in-stream no saltable (15 s)',
      Bumper: 'YouTube · bumper (6 s)',
      'In-feed video': 'YouTube · in-feed',
      'Shorts video': 'YouTube · Shorts',
    }[formato];
    if (video) return { pieza: `Video ${r}`, tipo: 'Video', ubicacion: video };
    if (formato === 'Shorts image') return { pieza: `Imagen ${r}`, tipo: 'Imagen', ubicacion: 'YouTube · Shorts' };
    if (formato === 'Thumbnail de video') return { pieza: `Imagen ${r}`, tipo: 'Imagen', ubicacion: 'YouTube · miniatura de video' };
    return null;
  }
  return null;
};

/** DV360: la misma idea, sus propios nombres. */
const reglasDv360 = (f, r) => {
  const { Canal: canal, Formato: formato } = f;
  const banner = BANNERS.includes(f['Medidas (px)']);
  if (canal === 'Display' && formato === 'Imagen estándar' && banner)
    return { pieza: `Banner ${medida(f['Medidas (px)'])}`, tipo: 'Imagen', ubicacion: 'Display · imagen' };
  if (canal === 'HTML5' && formato === 'HTML5 ZIP' && banner)
    return { pieza: `Banner ${medida(f['Medidas (px)'])}`, tipo: 'Imagen', ubicacion: 'Display · HTML5' };
  if (canal === 'Rich Media' && formato === 'Rich media banner' && banner)
    return { pieza: `Banner ${medida(f['Medidas (px)'])}`, tipo: 'Imagen', ubicacion: 'Rich media' };
  if (canal === 'Display' && formato === 'Intersticial móvil')
    return { pieza: `Intersticial ${medida(f['Medidas (px)'])}`, tipo: 'Imagen', ubicacion: `Intersticial · ${f['Ubicación'].toLowerCase()}` };
  if (canal === 'Native' && formato === 'Native display cuadrado') return { pieza: 'Imagen 1:1', tipo: 'Imagen', ubicacion: 'Native' };
  if (canal === 'Native' && formato === 'Native display rectangular') return { pieza: 'Imagen 1,91:1', tipo: 'Imagen', ubicacion: 'Native' };
  if (canal === 'Native' && formato === 'Native video') return { pieza: 'Video 1,91:1', tipo: 'Video', ubicacion: 'Native video' };
  if (canal === 'Video' && formato === 'Video alojado en DV360') return { pieza: `Video ${r}`, tipo: 'Video', ubicacion: 'Video in-stream / out-stream' };
  if (canal === 'CTV' && formato === 'Video CTV' && f['Medidas (px)']) return { pieza: 'Video 16:9', tipo: 'Video', ubicacion: 'Connected TV', ratio: '16:9' };
  if (canal === 'YouTube') {
    const video = {
      'In-stream saltable': 'YouTube · in-stream saltable',
      'Non-skippable in-stream': 'YouTube · in-stream no saltable (15 s)',
      Bumper: 'YouTube · bumper (6 s)',
      'In-feed video': 'YouTube · in-feed',
      Shorts: 'YouTube · Shorts',
      'Demand Gen video': 'Demand Gen · video',
    }[formato];
    if (video && r) return { pieza: `Video ${r}`, tipo: 'Video', ubicacion: video };
    if (formato === 'Demand Gen imagen') return { pieza: `Imagen ${enNombre(r)}`, tipo: 'Imagen', ubicacion: 'Demand Gen · imagen' };
    if (formato === 'Demand Gen carrusel') return { pieza: `Carrusel ${enNombre(r)}`, tipo: 'Imagen', ubicacion: 'Demand Gen · carrusel (2 a 10 tarjetas)' };
    if (formato === 'Pause ad') return { pieza: 'Imagen 1:1', tipo: 'Imagen', ubicacion: 'YouTube · pause ad (CTV)', ratio: '1:1' };
  }
  return null;
};

const PLATAFORMA = { google: 'Google Ads', dv360: 'DV360' }[MEDIO];
const especificaciones = [];
const vistas = new Set();
for (const f of datos.filter(f => f.Plataforma === PLATAFORMA)) {
  // Una fila con varias proporciones («16:9, 9:16, 1:1») es una ubicación en cada pieza.
  const rs = f.Ratio ? proporciones(f.Ratio) : [''];
  for (const r of rs) {
    const regla = (MEDIO === 'dv360' ? reglasDv360 : reglas)(f, r);
    if (!regla) continue;
    // Varias filas con la misma pieza y ubicación (otra resolución del mismo video): vale la primera.
    if (vistas.has(`${regla.pieza}|${regla.ubicacion}`)) continue;
    vistas.add(`${regla.pieza}|${regla.ubicacion}`);
    const banner = /^(Banner|Intersticial)/.test(regla.pieza);
    especificaciones.push({
      Pieza: regla.pieza,
      Formato: regla.tipo,
      Plataforma: f.Canal,
      Ubicación: regla.ubicacion,
      'Relación de aspecto': banner ? medida(f['Medidas (px)']) : regla.ratio ?? r,
      'Resolución recomendada (px)': f['Medidas (px)'] || (f['Mínimo (px)'] ? `${f['Mínimo (px)']} mín.` : ''),
      'Tipo de archivo': f.Archivo,
      'Peso máximo': f['Peso máx.'],
      Duración: f['Duración'],
      Textos: f['Textos (caracteres)'],
      'Otras indicaciones': f.Comentario || '',
    });
  }
}

// Una pieza sin ningún texto de plataforma (banners, intersticiales, algunos videos) lleva sus textos en el arte:
// titular y, en los banners e intersticiales, el llamado a la acción. La planilla no los trae: son un supuesto que el
// equipo valida en la Biblioteca (Gerardo, 2026-11-25).
const conTextos = new Set(especificaciones.filter(e => e.Textos).map(e => e.Pieza));
for (const e of especificaciones) {
  if (conTextos.has(e.Pieza)) continue;
  e['En la pieza'] = /^(Banner|Intersticial)/.test(e.Pieza) ? 'Titular: 30 · Llamado a la acción: 15' : 'Titular: 30';
}

process.stdout.write(
  JSON.stringify(
    {
      medio: { google: 'Google', dv360: 'DV360' }[MEDIO],
      clase: 'PAGOS',
      canal: 'Google Recursos',
      fuente: 'CDM - validacion_formatos_medios.xlsx (Formatos)',
      fecha: '2026-11-25',
      especificaciones,
      zonasSeguras: [],
      alertas: [],
    },
    null,
    1
  ) + '\n'
);
process.stderr.write(`${especificaciones.length} ubicaciones en ${new Set(especificaciones.map(e => e.Pieza)).size} piezas\n`);
