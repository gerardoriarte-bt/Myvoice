# Textos raíz: primero se aprueban las ideas, después se adaptan a cada medio

> **Ampliado por el [PRD](./v2/prd-proceso-de-campana.md) y el [spec](./v2/spec-proceso-de-campana.md) del
> proceso de campaña (v2)**, que suman media planning y el catálogo de medios. Este plan queda como
> el diagnóstico y las decisiones de origen; la referencia para construir son esos dos documentos.

Origen: el feedback de Buentipo del 2026-10-26, en dos láminas. La primera, «Prompt My Voice –
Ejemplo Terpel», es un **manual de oficio**: cómo se escribe un buen copy, con «[MARCA]» como
comodín. La segunda, «Feedback – My Voice», lista lo que falta: que deje de ser genérico, dos
opciones por texto con «dime por qué te gusta», funnel claro, contador por formato, audiencias de
marca con descriptores (estructura de The Brief), los elementos de una campaña (racional,
manifiesto, concepto, key visual), un ADN con profundidad estratégica llenado por Planning,
reglas de estilo («siempre rimado») y un **toolkit de campaña** aprobado por la marca, que ellos
mismos describen como «un ajuste mayor en la aprobación y procesos con la marca».

## Decisiones del usuario (2026-10-26)

1. **El manual de oficio es universal.** Vale para todas las marcas y va en el motor, no en el
   ADN de cada una.
2. **El proceso cambia.** El motor ya no escribe textos nuevos por cada medio. Primero genera
   **entre 5 y 10 textos raíz** a partir de la información de marca y el requerimiento; los
   aprobados son el único insumo de los medios.
3. **Las raíces las aprueba el equipo y después la marca.** El conjunto aprobado por la marca es
   el toolkit de campaña.
4. **Por ahora los medios solo adaptan.** No hay variación libre por medio.
5. **La generación por medio es única:** se pide **un medio y una cantidad**, por ejemplo
   «10 ads de carrusel de Meta», y se generan solo esas adaptaciones. Cada unidad trae todas sus
   partes: en ese caso, el caption, el texto en imagen y la descripción del post.
6. **La IA ayuda a completar el ADN, y hay un mínimo para generar.** Con un ADN incompleto el
   motor rellena los huecos con lugares comunes: se peca por incompleto. Por debajo del mínimo no
   se generan raíces; el porcentaje se determina midiendo, no a ojo.

## Diagnóstico: por qué sale genérico

La recolección de marca es débil, pero es la mitad del problema. La otra mitad es el motor.

**El proceso de hoy fabrica incoherencia.** El director decide un concepto y tres ángulos
(`directorService.ts`), y después **cada canal escribe desde cero, por separado**, con hasta 14
llamadas independientes que solo comparten ese resumen (`openaiService.ts`, `buildBrief`). Los
«divorcios creativos» y las metáforas mezcladas que la lámina 1 critica son lo que se espera de
catorce redactores que no se leen entre sí. Y el equipo aprueba decenas de textos por campaña, uno
por uno, cuando la decisión que importa es cuál idea va.

**El motor contradice el manual.** Las instrucciones de awareness le piden al director
«preferir 'descubre', 'mira esto', '¿sabías que…?'» (`directorService.ts:16`). La lámina 1 lo
prohíbe con nombre propio. El revisor (`criticService.ts`) marca nueve problemas: genérico,
deriva del concepto, tono, prohibición parafraseada, presupuesto, redundancia, CTA débil, voz de
agencia y tuteo. No detecta frases de relleno, preguntas como recurso fácil, manifiestos
filosóficos, el nombre de la marca repetido en el titular, campos semánticos mezclados ni un
slogan alterado.

**El ADN son cinco cajas de texto.** Voz (un desplegable de un catálogo global), propuesta de
valor, guía de voz, keywords y prohibiciones, más el PDF del manual del que se usan los primeros
18.000 caracteres. No hay audiencias de marca: la audiencia es **un texto libre por campaña**
(`ContentDNAProfile.targetAudience`). De los elementos de campaña solo existe el concepto
(`campaignConcept`). El tratamiento (tú, usted o vos) **no se declara**: se adivina con una
expresión regular sobre el texto de la marca (`localeRules.ts:45`), y las láminas de Buentipo
escriben en tú.

**El aprendizaje solo oye lo negativo con motivo.** Un rechazo guarda por qué
(`NegativeFeedback.reason`) y vuelve al motor como ejemplo a evitar. Una aprobación es un
booleano: el motor sabe qué gustó, nunca por qué. Y los ejemplos que recibe son los seis primeros,
sin criterio de relevancia (`promptBuilder.ts:58`, ver H2.D).

## Nivel 1 · Qué ve el usuario

Se dibuja en `design/MyVoice_Engine.pen`, en una sección «— Textos raíz». Son seis momentos.

### 0. El ADN, completo y con ayuda

El ADN de una marca muestra **qué tan completo está, en un porcentaje con peso**, no en campos
llenos: hoy la tarjeta dice «ADN 3/5» y cuenta igual una propuesta de valor de una palabra que una
bien escrita. Cada sección dice si está **completa, débil o vacía**, y por qué («la propuesta de
valor no dice contra quién compite»).

**La IA ayuda a llenarlo**, desde cuatro fuentes:

| Fuente | Qué propone |
|---|---|
| El manual de marca (PDF) | Voz, propuesta de valor, reglas, keywords, prohibiciones. Ya existe para cinco campos (`brandExtractionService.ts`); se amplía a las secciones nuevas y deja de cortar el manual en 18.000 caracteres. |
| El copy aprobado de la marca | Tratamiento, tics, longitud de frase, lo que la marca nunca dice. El voice fingerprint ya mira esto. |
| La web o redes de la marca (una URL) | Productos, audiencias visibles, assets y nombres de programas con su escritura exacta. |
| Una entrevista guiada con Planning | Para lo que no está escrito en ningún lado: tensión de la audiencia, insight, qué frena la compra. La IA pregunta, una sección por vez, y redacta la respuesta. |

**Lo que propone la IA queda como propuesta** hasta que una persona lo confirma o lo corrige. Se ve
distinto («propuesto por IA · sin confirmar») y **no cuenta para el mínimo**: si contara, la IA se
aprobaría a sí misma, y un ADN escrito por la IA sin revisar es genérico por construcción.

**Por debajo del mínimo no se generan raíces.** La campaña muestra qué falta y lleva a completarlo.
Entre el mínimo y el ADN completo se genera, con un aviso de qué secciones están débiles.

### 1. El brief completo

La campaña pide lo que una campaña de Buentipo ya tiene:

| Campo | Qué es | Hoy |
|---|---|---|
| Concepto | La frase que unifica la campaña | Existe |
| Racional | Por qué esta idea, en tres o cuatro líneas | No existe |
| Manifiesto | El texto largo que explica el concepto | No existe |
| Key visual | Descripción (y, cuando exista, la imagen) | No existe |
| Assets intocables | Nombres de premios, slogans, mecánica: van literales | Mezclado en «Brief» |
| Audiencia | **Se elige** entre las audiencias de la marca | Texto libre |
| Etapa del funnel | Awareness, consideración, conversión o retención: **obligatoria** | Opcional |
| Requerimiento | Qué se necesita y para cuándo | «Brief» |

### 2. Los textos raíz

Con el ADN y el brief, el motor propone **entre 5 y 10 textos raíz**. Cada raíz es un
**titular, una bajada y una idea de desarrollo** (dos o tres líneas que dicen hacia dónde se
estira en un formato largo), con el ángulo que la sostiene. Un titular solo no alcanza: de un
titular no sale un guion de video ni un email.

Cada raíz se marca con 👍 o 👎 y **pide un motivo corto en los dos casos**: «dime por qué te
gusta». Se puede pedir otra tanda; las raíces rechazadas y sus motivos entran a la siguiente como
lo que no hay que repetir.

### 3. Aprobación: el equipo, después la marca

El responsable de la campaña aprueba las raíces que van. Esas raíces, con el concepto, el
racional y el manifiesto, forman el **toolkit de campaña** y van a la marca por el portal de
revisión, como ya va el copy. La marca aprueba o rechaza cada raíz con comentario. Una raíz
rechazada por la marca vuelve al equipo.

Este es el «ajuste mayor» de la lámina 2: **lo que la marca aprueba deja de ser el texto de cada
medio y pasa a ser el toolkit.**

### 4. La generación por medio

Con el toolkit aprobado se abre la generación por medio. Es **un medio por vez y una cantidad**:

> Medio: **Carrusel de Meta (ads)** · Cantidad: **10**
> Raíces: las 4 aprobadas (por defecto, todas; se pueden elegir)

Salen 10 unidades. **Cada unidad trae todas sus partes juntas**, en ese caso el caption, el texto en
imagen y la descripción del post, y dice de qué raíz sale. Las unidades se reparten entre las
raíces elegidas, y las que comparten raíz se diferencian en el ángulo de entrada, no en la idea.

El medio no inventa: **adapta**. Acorta, expande, reordena y ajusta al formato, pero el gancho de la
raíz y los assets intocables llegan literales.

Cada parte muestra su contador contra el límite del formato («73/80 car»), también mientras se
edita. Hoy, al editar, solo se ve el número de caracteres, sin el límite (`ResultsTable.tsx:342`).

### 5. El control de la adaptación

Como la marca ya aprobó las ideas, la adaptación no vuelve a una ronda completa de cliente. Pasa
por un control automático (presupuesto de cada parte, gancho y assets literales, nada de promesas
que no estén en la raíz) y por **una revisión ligera del responsable**, que aprueba en lote. De
ahí sigue a Producción como hoy.

### Qué pasa con lo actual

Las campañas en curso terminan con el flujo de hoy. El flujo nuevo aplica a las campañas que se
crean desde que se despliega. La pantalla Generar de hoy (varios canales a la vez) se retira
cuando el flujo nuevo cubra los medios que se usan.

## Nivel 2 · Cómo se construye

Seis fases. La 0 y la 1 no esperan al `.pen`: no cambian ninguna pantalla y miden si el
problema es más del motor o de los datos.

### Fase 0 · Línea base (antes de tocar nada)

- Un set fijo de 5 campañas reales de Terpel (brief + ADN tal como están en producción), en
  `server/scripts/calidad/`.
- `npm run verify:calidad`: genera con el motor actual y evalúa cada texto contra la rúbrica de la
  lámina 1 con un juez separado del revisor (no el mismo modelo calificándose a sí mismo).
  Reporta, por regla, cuántos textos la rompen.
- Cuesta crédito de IA: no corre en CI. Se corre antes y después de cada fase y el resultado se
  anota en este plan.
- **Calibrar el mínimo del ADN.** El mismo set se genera con el ADN recortado a propósito: todo,
  sin audiencias, sin propuesta de valor, sin reglas, solo nombre y rubro. Se mide cuánto empeora
  cada recorte. Eso dice **qué secciones pesan más** (los pesos del porcentaje) y **dónde se cae
  la calidad** (el mínimo). Es la única forma de que el número no sea una opinión. Se repite
  cuando exista el ADN 2.0, porque sus secciones nuevas también hay que pesarlas.

### Fase 1 · El manual de oficio en el motor

Sin datos nuevos ni pantallas nuevas.

- **Sacar las contradicciones.** `directorService.ts:16` deja de sugerir «¿sabías que…?».
  Revisar los cuatro `FUNNEL_GUIDANCE` y `FUNNEL_HINT` contra el manual.
- **El manual como reglas del sistema**, en un archivo propio (`server/src/services/oficio.ts`):
  asertividad, cero acartonamiento, inteligente y corto, sin marca repetida en el titular si hay
  logo, insight del tema, el titular construye el concepto, un solo campo semántico, assets
  inviolables, cero relleno, bajada a tierra, preguntas solo con intención, mata a tus favoritos,
  ritmo en voz alta. Entra en el prefijo cacheable de `promptBuilder.ts`: es igual para todas las
  marcas, así que no rompe la caché.
- **Nuevas marcas del revisor** en `criticService.ts`: `filler` (relleno o frase de stock),
  `lazy-question`, `manifesto` (filosófico, lejos de la acción), `brand-in-headline`,
  `semantic-mix`, `asset-altered`. El fixer (`fixerService.ts`) reescribe las variaciones
  marcadas, como ya hace con las otras.
- **Reglas sin IA** en `validators.ts`, porque un modelo las olvida y una expresión regular no:
  aperturas prohibidas («¿Sabías que», «¿Cómo participar?», «Tal vez»), muletillas acartonadas
  («de inmediato»), y presencia literal de cada asset intocable cuando el slot lo exige.

Criterio de aceptación: `verify:calidad` baja las infracciones del manual frente a la línea base, sin
subir las de presupuesto ni prohibiciones.

### Fase 2 · ADN 2.0, llenado por Planning

- **Audiencias de marca**: modelo nuevo `AudienciaDeMarca` (`clientId`, nombre, descriptores:
  quién es, qué le importa, qué la frena, cómo habla). Sigue la estructura de The Brief, **que
  falta recibir** (ver preguntas abiertas). La campaña guarda `audienciaId` en vez de texto libre;
  el texto libre queda como respaldo para campañas viejas.
- **Tratamiento declarado**: campo `tratamiento` (`TU` | `USTED` | `VOS`) en `Client`.
  `brandUsesVoseo` deja de adivinar con una expresión regular y lee el campo; el validador de
  tuteo se generaliza a «tratamiento».
- **Reglas de estilo duras**: lista de reglas propias de la marca («siempre rimado», «nunca el
  miedo como motor»), distintas de la guía de voz en prosa. Entran al prompt como reglas, no como
  contexto, y el revisor las verifica.
- **Assets de marca intocables**: nombres de programas, premios y slogans permanentes, con su
  escritura exacta.
- **Quién llenó qué**: cada sección del ADN guarda autor, fecha y origen (`PERSONA` |
  `IA_PROPUESTA` | `IA_CONFIRMADA`). Planning es una función del equipo (`MiembroFuncion`), no un
  rol nuevo.
- **El porcentaje con peso**: `services/completitudAdn.ts`, el único lugar que lo calcula, para que
  Marcas, la campaña y el bloqueo no den tres números distintos. Cada sección suma según su peso
  (calibrado en la fase 0) y según su estado: vacía 0, débil la mitad, completa todo. «Débil» no es
  un contador de caracteres: lo decide una evaluación barata con un modelo chico, contra una
  rúbrica por sección («¿la propuesta de valor dice qué resuelve y contra qué?»), guardada con la
  sección y recalculada solo cuando la sección cambia. Lo propuesto por la IA y sin confirmar
  cuenta 0.
- **Secciones críticas además del porcentaje.** Un 80 % sin propuesta de valor no sirve. El
  mínimo es doble: el porcentaje **y** las secciones que la fase 0 muestre como imprescindibles
  (la hipótesis: propuesta de valor, tratamiento, al menos una audiencia y las prohibiciones).
- **El bloqueo vive en el servidor**: `POST /campanas/:id/raices` responde 409 con lo que falta si
  la marca no llega al mínimo; la pantalla lo muestra antes, pero no es la que decide. Mientras no
  exista el flujo de raíces, Generar muestra el aviso sin bloquear, para no cortar el trabajo de
  hoy.
- **La ayuda de la IA**: `services/asistenteAdn.ts`, con cuatro entradas. La extracción del PDF
  (`brandExtractionService.ts`) se amplía a las secciones nuevas y lee el manual entero por
  fragmentos en vez de cortarlo en 18.000 caracteres. El copy aprobado reusa el voice fingerprint.
  La URL se lee una vez y se guarda el texto, no se vuelve a consultar en cada generación. La
  entrevista es una conversación por sección: la IA pregunta, Planning responde, la IA redacta la
  sección y Planning la confirma. Todo lo que devuelve entra como `IA_PROPUESTA`.

### Fase 3 · Brief completo

`ContentDNAProfile` suma `racional`, `manifiesto`, `keyVisual` (texto; la imagen después) y
`assetsCampana` (lista, separada del brief en prosa). `funnelStage` pasa a obligatorio en las
campañas nuevas. El director recibe todo; los assets van literales.

### Fase 4 · Textos raíz y su aprobación

- Modelo `TextoRaiz` (`projectId`, `titular`, `bajada`, `desarrollo`, `angulo`, `estado`:
  `PROPUESTA` | `APROBADA_EQUIPO` | `RECHAZADA_EQUIPO` | `CON_LA_MARCA` | `APROBADA_MARCA` |
  `RECHAZADA_MARCA`, `motivo`, `tanda`). Pertenece a la campaña (`Project`), no al brief.
- `POST /campanas/:id/raices`: una llamada de director más una de escritura, 5 a 10 raíces. Las
  rechazadas de tandas anteriores entran con su motivo como ejemplos negativos.
- **El 👍 pide motivo.** Las raíces aprobadas y su motivo se vuelven la mejor señal positiva del
  aprendizaje (mejor que «este copy de Instagram se aprobó»); alimentan los ejemplos de H2.D.
- **El toolkit va al portal.** `ReviewSession.ronda` suma `TOOLKIT`, con items `textoRaizId`.
  El `CHECK` que hoy obliga a que cada item tenga exactamente uno de `savedVariationId` o `piezaId`
  se amplía a los tres. Las reglas del portal no cambian: una sola marca por sesión y una ronda
  homogénea. La marca aprueba o rechaza cada raíz; un rechazo exige texto.
- Quién decide: aprobar raíces es del responsable de la campaña (`permisosPieza.ts` como modelo:
  un solo archivo que decide).

### Fase 5 · Generación por medio

- **La unidad de un medio.** Cada `ChannelSpec` declara qué es **una unidad** de ese medio: el
  conjunto de partes que salen juntas. Hoy un spec declara slots con `count` (cuántas variaciones
  de cada parte), y el resultado es una lista suelta de textos por slot; con unidades, cada slot
  tiene `count: 1` dentro de la unidad y la cantidad la pide el usuario.
- **Medio nuevo: carrusel de Meta (ads)**, con caption (texto principal), texto en imagen y
  descripción del post, cada uno con su límite. Hay que confirmar los límites con quien compra
  medios; los de hoy en `instagramCarrusel.ts` son de carrusel orgánico (hook, slides, CTA).
- `POST /campanas/:id/adaptaciones` con `{ medio, cantidad, raices[] }`. **Una sola llamada de
  escritura por tanda**, no una por canal, y sin director: la espina ya es el toolkit. El revisor y
  el fixer siguen; el revisor gana un chequeo nuevo, «se aleja de la raíz».
- `SavedVariation` suma `textoRaizId` y `unidadId` (las partes de una misma unidad se aprueban y
  se mueven juntas). La etapa del copy (`aprobacion.ts`) gana el control ligero: las adaptaciones
  de un toolkit aprobado por la marca las aprueba el responsable en lote y no van a una ronda de
  cliente.
- La pantalla Generar se reemplaza por la generación por medio dentro de la campaña. Mientras
  convivan, Generar sigue funcionando para las campañas sin toolkit.

### Fase 6 · Contador y aprendizaje

- Contador contra el límite en toda edición de copy: Generar, Copy, Revisiones y Producción
  («corregir el copy»).
- Los motivos del 👍 y el 👎 de raíces y adaptaciones se guardan con su texto y su marca, y
  alimentan los ejemplos del motor (y, cuando llegue, la recuperación de H2.D).

## Orden y dependencias

```
Fase 0 ─► Fase 1 ─────────────────────────────┐
          (motor)                              ▼
Fase 2 (ADN) ─► Fase 3 (brief) ─► Fase 4 (raíces) ─► Fase 5 (por medio) ─► Fase 6
```

La 1 va primero porque las raíces las escribe el mismo motor: si sigue siendo genérico, las raíces
también. Las fases 2 a 5 se diseñan en el `.pen` antes de codificarse, y la 4 y la 5 se despliegan
juntas: un toolkit aprobado que no se puede adaptar no sirve para nada.

## Preguntas abiertas

- **El porcentaje mínimo** no se fija en este plan: sale de la calibración de la fase 0. Lo que sí
  se decide acá es que existe, que es doble (porcentaje y secciones críticas) y que lo propuesto
  por la IA sin confirmar no cuenta.

- **La estructura de The Brief (Brand kit)**: sus secciones y cómo describe cada audiencia. Sin
  eso, la fase 2 diseña audiencias a ciegas.
- **Los límites del carrusel de Meta (ads)** por parte, y qué otros medios se piden más, para
  decidir el orden en que se convierten a unidades.
- **El key visual**: ¿alcanza la descripción en texto o hace falta subir la imagen para que el
  motor la lea?
- **La revisión ligera del responsable**: ¿basta aprobar en lote o el responsable tiene que ver
  cada unidad?

## Fuera de alcance

- La variación libre por medio: por ahora el medio solo adapta (decisión 4).
- Que el motor genere el manifiesto o el racional: los escribe el equipo creativo; el motor los
  usa.
- Medir desempeño real en pauta (H2.C).
