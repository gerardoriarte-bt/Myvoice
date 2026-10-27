# Contrato · Planning → My Voice (plan de medios)

Estado: borrador para revisión · 2026-10-27
Producto: [prd-proceso-de-campana.md](./prd-proceso-de-campana.md) (PM-1 a PM-6) ·
Spec: [spec-proceso-de-campana.md](./spec-proceso-de-campana.md) (§ 4.5 y § 4.6)

## 1. Para qué es este documento

El plan de medios lo arma **Planning**, un módulo de My Voice que todavía no existe. Ahí se eligen
medios, formatos, cantidades y fechas. El proceso de campaña solo **usa** ese plan para escribir.

My Voice es la **fuente de verdad de la marca**: el ADN, las audiencias y el brief (con sus frentes)
existen antes de que Planning arme el plan, y Planning los lee; no los crea ni los redefine.

Como los dos lados se van a construir en momentos distintos, este documento fija lo que uno le
manda al otro. Mientras Planning no exista, el plan se carga con una **planilla con las mismas
columnas** que este contrato: la simulación y el módulo real llenan la misma estructura, y la
pantalla de plan de medios no cambia cuando llegue el módulo.

## 2. El proceso

```
         PLANNING                                    PROCESO DE CAMPAÑA (My Voice)
         ────────                                    ─────────────────────────────
                                              ADN ─► Brief (frentes) ─► Raíces ─► Toolkit
                                                          │                         │
  1. Abre el plan de una campaña ◄── lee ─────────────────┘ campaña, marca, frentes │
     (el brief ya existe)                                                           │
  2. Elige medio y formato      ◄── lee ── catálogo de formatos (compartido)        │
  3. Define cantidad, fechas,                                                       │
     frente de cada línea                                                           │
  4. Envía una versión del plan ──────────► 5. Valida y guarda la versión           │
                                            6. Muestra qué se va a escribir         │
                                            7. Genera adaptaciones ◄────────────────┘ (toolkit aprobado)
                                            8. Aprueba unidades ─► Producción
  9. Muestra el avance por línea ◄── estado ─┘
 10. Cambia el plan (nueva versión) ──────► 11. Marca las unidades afectadas
```

El plan puede llegar **antes** de que la marca apruebe el toolkit (se arma en paralelo); lo que
espera al toolkit es la generación (PM-2).

## 3. Lo que Planning necesita leer de My Voice

| Qué | Para qué |
|---|---|
| La campaña v2 (`projectId`), su marca y su responsable | Un plan es siempre de una campaña de una sola marca. |
| Los **frentes** del brief (audiencia × etapa) | Cada línea elige uno al armarse. Si Planning necesita uno que no existe, se lo pide al responsable, que lo agrega al brief. |
| El **catálogo de medios y formatos** (medio → formato → medidas, textos y archivo; solo medios activos) | Planning elige de la misma lista con la que My Voice escribe. Un formato que no está en el catálogo no se puede escribir. |

El catálogo es **uno solo y compartido**: no hay una lista de medios de Planning y otra de My Voice.
Así no hace falta «resolver» un formato escrito a mano, y sumar un formato (CAT-2) lo habilita en
los dos lados a la vez.

Planning **no** necesita ver las raíces: decide cuánto y dónde; qué idea usa cada unidad se decide
en el proceso de campaña.

## 4. Lo que Planning envía

Una **versión** del plan completa cada vez (no cambios sueltos). My Voice compara con la versión
anterior para saber qué cambió (§ 6).

### 4.1 El plan

| Campo | Obligatorio | Para qué lo usa My Voice |
|---|---|---|
| `projectId` | Sí | A qué campaña pertenece. Debe ser una campaña v2 del mismo workspace. |
| `version` | Sí | Número creciente. My Voice rechaza una versión menor o igual a la última. |
| `enviadoPor` | Sí | Quién lo envió: alguien con la función **Medios** o el **responsable** de la campaña (puede ser el ejecutivo de cuentas). Queda en el historial. |
| `enviadoEn` | Sí | Cuándo. |
| `notas` | No | Texto libre que se muestra arriba del plan. |

### 4.2 Cada línea

| Campo | Obligatorio | Para qué lo usa My Voice |
|---|---|---|
| `lineaId` | Sí | Id **estable** que Planning mantiene entre versiones. Sin él, cada versión nueva parece un plan nuevo y se pierde lo ya escrito. |
| `formatoId` | Sí | Formato del catálogo. Define qué partes se escriben y con qué límites. |
| `frenteId` | Sí | Un frente del brief de esa campaña: decide la audiencia, la etapa y las raíces que se adaptan. |
| `unidades` | Sí | Cuántos **copys distintos** hay que escribir para la línea (§ 5). |
| `piezas` | Según formato | En formatos de varias piezas (carrusel), cuántas láminas lleva cada unidad. El catálogo dice qué formatos lo piden y el rango permitido. |
| `fechaSalida` | Sí | Cuándo sale al aire; ordena el trabajo. |
| `fechaCopy` | No | Hasta cuándo se necesita el copy aprobado, si es antes que la salida. |
| `destino` | Según formato | URL final o destino del CTA. Obligatorio en formatos de búsqueda y en los que lo marque el catálogo. |
| `indicaciones` | No | Lo que el copy debe tener en cuenta y no está en el formato («zona: rutas a la costa», «mencionar horario 24 h»). Entra al prompt como contexto, no reemplaza al brief. |
| `responsableId` | No | Quién aprueba las unidades de esta línea; si falta, el responsable de la campaña. |

### 4.3 Lo que Planning **no** envía

- **Presupuesto, inversión, impresiones, segmentación técnica de pauta.** My Voice no los usa para
  escribir (PRD § 6: comprar y medir quedan fuera). Si Planning los maneja, se quedan allá.
- **Texto de copy.** Planning dice qué hay que escribir, no lo escribe.

## 5. `unidades` no es frecuencia

La diferencia más fácil de confundir. Un plan dice «20 inserciones de carrusel en Instagram»; eso
puede ser 20 copys distintos o 4 copys que rotan. My Voice necesita **cuántos textos distintos**
escribir. Si Planning maneja también la frecuencia o las inserciones, las guarda aparte; al
contrato solo viaja `unidades`.

Qué es una unidad lo define el formato del catálogo:

| Grupo de formatos | Qué escribe My Voice en una unidad |
|---|---|
| Redes sociales (post, reel, video) | El **caption**. El texto en imagen o en pantalla lo resuelve Diseño. |
| Carrusel | El **caption** y el **texto de cada lámina**, tantas como diga `piezas` (§ 5.1). |
| Búsqueda | Un anuncio completo: sus títulos y descripciones (las repeticiones están en el formato). |
| Radio | Un guion con su duración. |
| Exterior | Titular y bajada. |

### 5.1 Carruseles: una lámina, un texto, o un relato repartido

Planning manda cuántas láminas lleva el carrusel (`piezas`). **Cómo se reparte el texto** es una
decisión creativa y se toma en el proceso de campaña, por línea:

- **Un texto por lámina**: cada lámina se sostiene sola (5 láminas = 5 textos, más el caption).
- **Un relato repartido**: un texto más largo que se divide en las láminas y se lee en orden.

El valor por defecto lo da el formato; el responsable o Copy lo cambia en la línea antes de
generar. Cambiarlo después deja las unidades «desactualizadas», como un cambio de formato.

## 6. Cuando el plan cambia

Cada versión nueva se compara con la anterior **por `lineaId`**:

| Cambio en la línea | Qué hace My Voice |
|---|---|
| Línea nueva | Queda lista para generar. |
| Suben las `unidades` | Se generan solo las que faltan. |
| Bajan las `unidades` | Las sobrantes quedan marcadas «fuera del plan»; no se borran. Si alguna ya está en Producción, avisa al responsable en vez de sacarla. |
| Cambia `formatoId`, `frenteId` o `piezas` | Las unidades existentes quedan «desactualizadas» y se regeneran a pedido; las aprobadas no se tocan solas. |
| Cambian fechas, `destino`, `indicaciones` o responsable | Se actualiza la línea; las unidades no se regeneran (el `destino` sí se revalida). |
| Línea eliminada | Sus unidades quedan «fuera del plan». Las que están en Producción generan un aviso. |

Nada que la marca o el responsable ya aprobaron cambia sin que una persona lo decida.

## 7. Lo que My Voice devuelve

Planning necesita ver el avance sin entrar al proceso de campaña (PM-4):

| Campo | Por línea |
|---|---|
| `estado` | `ESPERA_TOOLKIT` · `LISTA` · `GENERANDO` · `EN_CONTROL` · `APROBADA` · `EN_PRODUCCION` |
| `unidades` | Pedidas, generadas, aprobadas, en producción, fuera del plan |
| `enlace` | A la línea dentro del proceso de campaña |
| `avisos` | Por qué una línea está detenida («el toolkit de ese frente no está aprobado», «el formato cambió de versión») |

## 8. Validaciones al recibir un plan

Se rechaza la versión entera, con la lista de errores por línea, si:

- la campaña no es v2, es de otro workspace o el usuario no puede verla (404, como el resto de la
  tenancy);
- `version` no es mayor que la última;
- un `formatoId` no existe o está oculto para el workspace;
- quien envía no tiene la función Medios ni es el responsable de la campaña;
- un `frenteId` no es un frente del brief de esa campaña;
- falta `piezas` en un formato que lo pide, o está fuera de su rango;
- `unidades` < 1, o falta `destino` en un formato que lo pide;
- se repite un `lineaId`.

Un plan nunca trae audiencias ni frentes nuevos: si falta un frente, se agrega primero al brief.

## 9. Mientras Planning no existe

- **Planilla**: una fila por línea con las columnas de § 4.2, más `version` en el nombre del
  archivo o en una celda. La sube el responsable o alguien con función Medios.
- Como la planilla no tiene ids, `lineaId` se arma con `formato + frente + fechaSalida`
  y se le avisa a quien sube que cambiar esas columnas crea una línea nueva.
- `formatoId` se escribe con el id del catálogo; la pantalla de importación ofrece la lista para
  copiar. Un nombre que no coincide se rechaza con la sugerencia más parecida, no se adivina.

## 10. Decisiones (2026-10-27)

1. **Planning elige el frente**, y el brief existe antes: My Voice es la fuente de verdad de la
   marca (ADN, audiencias, brief). Planning no crea frentes ni audiencias.
2. **Envían** la función Medios o el responsable de la campaña (puede ser el ejecutivo de cuentas).
3. **Planning no ve las raíces.** Qué raíz usa cada unidad se decide en el proceso de campaña.
4. **Carruseles**: Planning manda cuántas láminas (`piezas`); si es un texto por lámina o un
   relato repartido se decide en el proceso de campaña, por línea (§ 5.1).

## 11. Preguntas abiertas

1. ¿Qué otros formatos tienen varias piezas además del carrusel (historias en secuencia, series de
   video)? Definen si `piezas` alcanza o hace falta un tipo de pieza por lámina.
2. ¿Cuál es el valor por defecto del reparto en carrusel: un texto por lámina o relato repartido?
