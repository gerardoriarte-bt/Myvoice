# CDM · qué hay que construir

Estado: por diseñar · 2026-10-28 · Términos: [glosario.md](./glosario.md)

Lo usa **Planning** (y Cuentas para aprobar piezas). Es dueño de la biblioteca de medios, los
paquetes de formatos de cada marca, el cuadro de materiales y la aprobación de piezas.

## 1. Partes

| Parte | Qué hace | Base existente |
|---|---|---|
| **Marca** | Ve la marca compartida y le asigna su equipo y sus paquetes de formatos. | — |
| **Biblioteca de medios** | Medio → formato → medidas, campos de texto (con su largo y si van en pieza o de plataforma) y especificaciones de archivo. Agregar un medio con todos sus formatos; cargar desde planilla; versiones. | Las cuatro pantallas de catálogo diseñadas en el `.pen` (marcadas «SUPUESTO»), que pasan a ser de CDM. |
| **Campaña en CDM** | Abre la campaña de My Voice del lado de medios: referencia, fechas, objetivos. | — |
| **Cuadro de materiales** | Las líneas: formato, frente, cuántos copys, láminas, fechas. Se arma, se versiona y se envía. Muestra el estado del copy de cada línea en My Voice. | La pantalla «Plan de medios · importado» y el contrato v2. |
| **Piezas** | Recibe el copy aprobado por línea, sigue la producción y la aprobación del responsable y del cliente (con la URL final). | El tablero de Producción de My Voice, como referencia. |
| **Portafolio** | Todas las campañas con su etapa y «espera a». | — |
| **Mi cola** | Lo pendiente de cada persona en todas las campañas. | «Lo mío» de Producción, como referencia. |

## 2. Funciona solo

Sin My Voice: la biblioteca, el cuadro y la aprobación de piezas siguen; el copy se escribe a mano
en cada campo de texto del formato, con los mismos largos.

## 3. Orden propuesto

1. Biblioteca de medios (es lo que también hereda My Voice).
2. Cuadro de materiales con el contrato.
3. Piezas y aprobación.
4. Portafolio y cola.

El orden exacto se decide al alternar con My Voice: la biblioteca y el cuadro conviene que existan
cuando My Voice llegue a su paso 6 ([my-voice.md](./my-voice.md)).
