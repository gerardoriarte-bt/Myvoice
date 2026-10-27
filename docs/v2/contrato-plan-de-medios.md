# Contrato · Planning → My Voice (plan de medios)

Estado: borrador para revisión · 2026-10-27
Producto: [prd-proceso-de-campana.md](./prd-proceso-de-campana.md) (PM-1 a PM-6) ·
Spec: [spec-proceso-de-campana.md](./spec-proceso-de-campana.md) (§ 4.5 y § 4.6)

## 1. Para qué es este documento

El plan de medios lo arma **Planning**, un módulo de My Voice que todavía no existe. Ahí se eligen
medios, formatos, cantidades y fechas. El proceso de campaña solo **usa** ese plan para escribir.

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
| Los **frentes** del brief (audiencia × etapa) | Cada línea se asigna a un frente al armarla; ver § 4.2. |
| El **catálogo de formatos** (medio → formato → partes) | Planning elige de la misma lista con la que My Voice escribe. Un formato que no está en el catálogo no se puede escribir. |
| Las raíces aprobadas por la marca, por frente (opcional) | Solo si Planning quiere fijar qué idea usa una línea. |

El catálogo es **uno solo y compartido**: no hay una lista de medios de Planning y otra de My Voice.
Así no hace falta «resolver» un formato escrito a mano, y sumar un formato (CAT-2) lo habilita en
los dos lados a la vez.

## 4. Lo que Planning envía

Una **versión** del plan completa cada vez (no cambios sueltos). My Voice compara con la versión
anterior para saber qué cambió (§ 6).

### 4.1 El plan

| Campo | Obligatorio | Para qué lo usa My Voice |
|---|---|---|
| `projectId` | Sí | A qué campaña pertenece. Debe ser una campaña v2 del mismo workspace. |
| `version` | Sí | Número creciente. My Voice rechaza una versión menor o igual a la última. |
| `enviadoPor` | Sí | Quién de Planning lo envió; queda en el historial. |
| `enviadoEn` | Sí | Cuándo. |
| `notas` | No | Texto libre que se muestra arriba del plan. |

### 4.2 Cada línea

| Campo | Obligatorio | Para qué lo usa My Voice |
|---|---|---|
| `lineaId` | Sí | Id **estable** que Planning mantiene entre versiones. Sin él, cada versión nueva parece un plan nuevo y se pierde lo ya escrito. |
| `formatoId` | Sí | Formato del catálogo. Define qué partes se escriben y con qué límites. |
| `frenteId` | Sí* | A qué frente pertenece: decide la audiencia, la etapa y las raíces que se adaptan. |
| `unidades` | Sí | Cuántos **copys distintos** hay que escribir para la línea (§ 5). |
| `fechaSalida` | Sí | Cuándo sale al aire; ordena el trabajo. |
| `fechaCopy` | No | Hasta cuándo se necesita el copy aprobado, si es antes que la salida. |
| `raizIds` | No | Raíces que debe usar la línea. Vacío = todas las aprobadas del frente. |
| `destino` | Según formato | URL final o destino del CTA. Obligatorio en formatos de búsqueda y en los que lo marque el catálogo. |
| `indicaciones` | No | Lo que el copy debe tener en cuenta y no está en el formato («zona: rutas a la costa», «mencionar horario 24 h»). Entra al prompt como contexto, no reemplaza al brief. |
| `responsableId` | No | Quién aprueba las unidades de esta línea; si falta, el responsable de la campaña. |

\* **Mientras el brief no tenga el frente que Planning necesita**, la línea puede llegar con
`audienciaId` + `etapa` en lugar de `frenteId`. My Voice la muestra «sin frente» y avisa al
responsable para que agregue ese frente al brief: Planning no crea frentes, porque un frente es una
decisión creativa (pide sus propias raíces y pasa por la marca).

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
| Redes sociales (posts, carruseles, reels, video) | El **caption**. El texto en imagen o en pantalla lo resuelve Diseño. |
| Búsqueda | Un anuncio completo: sus títulos y descripciones (las repeticiones están en el formato). |
| Radio | Un guion con su duración. |
| Exterior | Titular y bajada. |

## 6. Cuando el plan cambia

Cada versión nueva se compara con la anterior **por `lineaId`**:

| Cambio en la línea | Qué hace My Voice |
|---|---|
| Línea nueva | Queda lista para generar. |
| Suben las `unidades` | Se generan solo las que faltan. |
| Bajan las `unidades` | Las sobrantes quedan marcadas «fuera del plan»; no se borran. Si alguna ya está en Producción, avisa al responsable en vez de sacarla. |
| Cambia `formatoId`, `frenteId` o `raizIds` | Las unidades existentes quedan «desactualizadas» y se regeneran a pedido; las aprobadas no se tocan solas. |
| Cambian fechas, `destino`, `indicaciones` o responsable | Se actualiza la línea; las unidades no se regeneran (el `destino` sí se revalida). |
| Línea eliminada | Sus unidades quedan «fuera del plan». Las que están en Producción generan un aviso. |

Nada que la marca o el responsable ya aprobaron cambia sin que una persona lo decida.

## 7. Lo que My Voice devuelve

Planning necesita ver el avance sin entrar al proceso de campaña (PM-4):

| Campo | Por línea |
|---|---|
| `estado` | `SIN_FRENTE` · `ESPERA_TOOLKIT` · `LISTA` · `GENERANDO` · `EN_CONTROL` · `APROBADA` · `EN_PRODUCCION` |
| `unidades` | Pedidas, generadas, aprobadas, en producción, fuera del plan |
| `enlace` | A la línea dentro del proceso de campaña |
| `avisos` | Por qué una línea está detenida («el frente no existe en el brief», «el formato cambió de versión») |

## 8. Validaciones al recibir un plan

Se rechaza la versión entera, con la lista de errores por línea, si:

- la campaña no es v2, es de otro workspace o el usuario no puede verla (404, como el resto de la
  tenancy);
- `version` no es mayor que la última;
- un `formatoId` no existe o está oculto para el workspace;
- un `frenteId` no es de esa campaña, o un `audienciaId` no es de la marca;
- `unidades` < 1, o falta `destino` en un formato que lo pide;
- se repite un `lineaId`.

Una línea con `audienciaId` + `etapa` sin frente no es un error: se acepta y queda `SIN_FRENTE`.

## 9. Mientras Planning no existe

- **Planilla**: una fila por línea con las columnas de § 4.2, más `version` en el nombre del
  archivo o en una celda. La sube el responsable o alguien con función Medios.
- Como la planilla no tiene ids, `lineaId` se arma con `medio + formato + frente + fechaSalida`
  y se le avisa a quien sube que cambiar esas columnas crea una línea nueva.
- `formatoId` se escribe con el id del catálogo; la pantalla de importación ofrece la lista para
  copiar. Un nombre que no coincide se rechaza con la sugerencia más parecida, no se adivina.

## 10. Preguntas abiertas

1. ¿Planning elige el **frente** (requiere que el brief esté listo antes) o solo audiencia y etapa?
   El contrato acepta las dos, y recomienda frente.
2. ¿Quién puede enviar un plan: solo la función Medios, o también el responsable?
3. ¿Planning necesita las raíces aprobadas para decidir unidades, o le basta con el frente?
4. Formatos con **varias piezas en una unidad** (carrusel de 5 láminas): ¿una unidad es el
   carrusel entero con un caption, o cada lámina? Hoy el contrato asume el carrusel entero.
