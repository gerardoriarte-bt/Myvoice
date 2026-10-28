# Contrato · CDM ↔ My Voice

Estado: borrador · 2026-10-28 · Términos: [glosario.md](./glosario.md)
Reemplaza a [../v2/contrato-plan-de-medios.md](../v2/contrato-plan-de-medios.md): el «módulo
Planning» que suponía es el CDM. Las reglas de versiones, validaciones y cambios de aquel documento
siguen valiendo con los nombres nuevos; este documento manda donde difieran.

## 1. Qué viaja

```
                CDM                                         My Voice
                ───                                         ────────
  Biblioteca de medios  ──── formatos y campos de texto ───►  escribe dentro de esos largos
  Cuadro de materiales  ──── qué escribir, por línea ──────►  adaptaciones
  Cuadro de materiales  ◄─── audiencias y frentes ─────────  ADN y brief
  Líneas                ◄─── copy aprobado por formato ────  aprobación del responsable
  Piezas                ──── estado de aprobación ─────────►  medición
```

No viajan: el media plan y el presupuesto, la segmentación de pauta, los textos raíz, el toolkit.

## 2. My Voice lee de CDM

### 2.1 La biblioteca de medios

My Voice **hereda** de cada formato solo lo que necesita para escribir:

| Campo | Para qué |
|---|---|
| `formatoId`, `version` | Qué formato y con qué versión se escribió (lo ya escrito no cambia si el formato cambia). |
| `medio`, `nombre`, `tipoEnMedio` | Mostrarlo en pantalla. |
| `camposDeTexto[]`: `clave`, `etiqueta`, `ubicacion` (`EN_PIEZA` \| `PLATAFORMA`), `unidad` (caracteres, palabras, segundos), `min`, `max`, `repeticiones`, `obligatorio`, `ctasPermitidos?` | Qué escribe la IA y con qué límites. |
| `piezas` (`min`, `max`) | Formatos de varias piezas, como el carrusel. |
| `guia` | Cómo se escribe bien ese formato (entra al prompt). |

Medidas y especificaciones de archivo **no** entran a My Voice: son del Adaptador y de Diseño. My
Voice no edita la biblioteca; si falta un formato, se pide en CDM.

### 2.2 El cuadro de materiales

Una **versión completa** cada vez, comparada por `lineaId` con la anterior
([v2, § 6](../v2/contrato-plan-de-medios.md)).

| Campo | Obligatorio | Para qué |
|---|---|---|
| `campanaId`, `version`, `enviadoPor`, `enviadoEn` | Sí | De qué campaña, qué versión y quién la envió (Planning o el responsable). |
| `lineaId` | Sí | Id estable entre versiones. |
| `formatoId` | Sí | Formato de la biblioteca. |
| `frenteId` | Sí | Frente del brief: decide audiencia, etapa y textos raíz que se adaptan. |
| `cantidad` | Sí | Cuántos copys **distintos** (no inserciones ni frecuencia). |
| `piezas` | Según formato | Láminas de un carrusel. |
| `fechaSalida`, `fechaCopy` | Sí / No | Ordena el trabajo. |
| `referencia` | No | Texto libre, si la línea es de una referencia distinta a la de la campaña. |
| `indicaciones` | No | Contexto para el copy que no está en el formato. |

## 3. CDM lee de My Voice

| Dato | Para qué |
|---|---|
| Marca, campaña, responsable | Abrir la campaña del lado de CDM. |
| Audiencias del ADN y frentes del brief | Elegir el frente de cada línea. CDM no crea audiencias ni frentes. |
| Referencia de la campaña | Mostrarla en el cuadro. |
| Estado de My Voice por campaña y por línea | El «espera a» y la navegación cruzada ([flujo.md](./flujo.md), § 4). |
| **Copy aprobado por línea** | Qué texto va en qué formato: cada campo con su texto, separado en copy en pieza y copy de plataforma, con la versión del formato. |

Si un copy aprobado cambia después, CDM recibe la versión nueva y marca la línea «A revisar»; nunca
se reemplaza en silencio una pieza ya producida.

## 4. Sin CDM

Si la marca no usa CDM, My Voice usa su biblioteca propia (los 14 canales de hoy, migrados a la misma
forma de formato) y un cuadro armado a mano en la campaña, con los mismos campos de § 2.2. Así la
pantalla de adaptaciones es la misma con o sin CDM.

## 5. Abierto

- Cómo se identifica la misma marca y la misma campaña en las dos herramientas (id compartido o
  tabla de correspondencia).
- Si CDM y My Voice se hablan por API, por eventos o comparten base.
- Dónde nace la campaña: hoy se asume en My Voice (el brief va antes que el cuadro). Ver
  [decisiones.md](./decisiones.md).
