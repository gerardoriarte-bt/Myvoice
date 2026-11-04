# Spec · CDM

Estado: propuesta · 2026-10-28 · Producto: [../producto/prd-cdm.md](../producto/prd-cdm.md) · Datos:
[../datos/arquitectura-de-datos.md](../datos/arquitectura-de-datos.md)

## 1. Dónde vive

`server/src/cdm/` (biblioteca, paquetes, cuadro) y `src/cdm/` en el frontend, dentro del marco común. No
lee tablas de My Voice ni de la parte común: usa `contrato/` para marca, campaña, audiencias y el estado
del copy.

## 2. Biblioteca

- **Global** (sin `workspaceId`): no contiene datos de clientes. La editan las personas con función
  Planning.
- `Medio → Formato → FormatoVersion`. Una versión congela sus **medidas**, sus **campos de texto** y su
  **archivo**. Cambiar cualquiera crea una versión nueva; lo escrito sigue con la suya.
- Un medio queda en `BORRADOR` hasta que cada formato tiene al menos un campo de texto; en borrador no
  se puede elegir en un cuadro.
- **Organizar por** (CD-2) es una consulta, no un dato: `medio`, `tipoDeFormato`, `tipoDeArchivo`,
  rango del campo de texto más largo (`≤40`, `41–125`, `126–300`, `>300`), `creadoEn` (este mes,
  últimos 3 meses, antes). Índices para cada agrupación.

## 3. Carga desde planilla

Una fila por formato: `medio, tipo en el medio, formato, medidas, campos de texto (clave · ubicación ·
unidad · máximo · repeticiones), archivo, guía`. En seco por defecto; muestra lo nuevo, lo que cambia (y
qué versión crea) y lo que tiene errores, que no se carga. Si el medio no existe, se crea en borrador.
La misma lógica sirve a un script (`npm run cdm:importar`, en seco salvo `-- --apply`, como los demás).

## 4. Cuadro de materiales

- `Cuadro { campanaId, version }` y `LineaDeCuadro { lineaId estable, formatoVersionId, etapa,
  variaciones, piezas?, fechaSalida, fechaCopy?, referencia?, indicaciones? }`.
- Se envía **completo** cada vez; My Voice compara por `lineaId`.
- Validaciones al enviar: formato activo y no oculto para la marca, `variaciones ≥ 1`, `piezas` dentro
  del rango del formato, `lineaId` sin repetir, etapa válida. Un error rechaza la versión entera con la
  lista por línea.

## 5. Estado por línea

CDM no guarda el estado del copy ni de las piezas: lo pide a My Voice por contrato al mostrar el cuadro
(«espera a», copy aprobado, piezas en Producción). Así no hay dos estados que se desincronizan.

## 6. Tenencia

Paquetes, cuadros y líneas llevan `workspaceId` y `clientId`, con los guards de `lib/tenancy.ts` y 404
para lo ajeno. La biblioteca es global y de solo lectura para quien no tiene función Planning.
