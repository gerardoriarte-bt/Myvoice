# Plan · Respuestas a PQRS con la voz de la marca

Estado: propuesta · 2026-11-12 · Decisiones 23 a 27 en
[ecosistema/decisiones.md](./ecosistema/decisiones.md) · Depende del ADN 2.0
([plan-adn-2.md](./plan-adn-2.md))

## Por qué

El equipo de atención de la agencia responde las peticiones, quejas, reclamos y sugerencias (PQRS) de
las marcas que maneja. Hoy escribe cada respuesta a mano, sin la voz ni el tratamiento que la marca
definió en su ADN, y sin un registro de quién aprobó qué.

My Voice ya sabe cómo habla cada marca. Lo que falta es un lugar para responder casos, que es un trabajo
distinto a escribir campañas. Por eso esto es un área, no un medio:

- una campaña parte de un brief; una PQRS parte del mensaje de un cliente;
- el motor de campañas propone un concepto y ángulos, y aquí eso sobra;
- la respuesta depende de hechos que la IA no conoce (el estado del pedido, si procede un reembolso). Sin
  ellos inventa compromisos;
- tiene plazos legales y el mensaje del cliente trae datos personales (Ley 1581 de 2012).

## Supuestos de partida

| Supuesto | Valor | Por qué importa |
|---|---|---|
| Quién responde | El equipo de atención de la agencia, con usuario. Nadie externo por ahora. | Reusa login, funciones y permisos. No hay portal para la marca. |
| Volumen base | **50 casos al día por workspace**, entre todas las marcas, repartidos entre 3 a 5 personas (10 a 15 casos cada una). Picos de hasta 150. | Con este volumen alcanza con pegar el caso a mano. Una integración con el sistema de tickets se evalúa si el volumen real pasa los 150 diarios de forma sostenida. |
| Revisión legal | Fuera de la herramienta. La IA sugiere cuándo hace falta. | No hay un segundo paso de aprobación dentro de My Voice. |
| Políticas de la marca | Una sección **opcional** del ADN, que solo se ve cuando el área está encendida. | No cambia el mínimo del ADN para hacer campañas. |

El volumen es una suposición para diseñar. Se corrige con lo que muestre el piloto.

## Nivel 1 · Qué ve el usuario (se resuelve en el `.pen`)

### Quién hace qué

| Quién | Qué hace |
|---|---|
| **Atención** (función nueva, interna) | Registra el caso, confirma el tipo, escribe los hechos verificados, revisa el borrador y lo deja listo para aprobar. |
| **IA** | Propone el tipo, el tema y la urgencia; propone un borrador; marca promesas sin respaldo y sugiere revisión legal cuando la detecta. |
| **Responsable de atención** | Aprueba la respuesta antes de enviarla. Puede ser la misma persona de Atención si la marca lo permite (abierto). |
| **Estrategia** | Completa la sección «Atención al cliente» del ADN de la marca. |

### Encender el área

- Un manager enciende **PQRS** por marca, igual que se encienden los módulos (decisión 12).
- Al encenderla aparece en el ADN de esa marca la sección **«Atención al cliente»**. No es obligatoria
  y no cuenta para el mínimo del 75 %. Si está vacía, el área funciona igual, pero cada respuesta avisa
  «La marca no tiene políticas de atención: verifica los hechos con más cuidado».
- Una submarca hereda la sección de su madre mientras no defina la propia.

### Qué lleva la sección «Atención al cliente» del ADN

- **Políticas:** devoluciones, garantías, cambios, tiempos de entrega o de respuesta, escalamiento.
- **Canales oficiales** que se pueden dar al cliente: línea, correo, horario.
- **Fórmulas** de saludo y de cierre, y la firma.
- **Lo que nunca se promete o se dice** en atención: compensaciones, admitir responsabilidad, fechas sin
  confirmar. Se suma a las prohibiciones generales de la marca.

### Pantallas

1. **Bandeja de casos.** Los casos de todas las marcas con el área encendida, ordenados por fecha límite.
   Cada uno muestra marca, tipo, estado (por responder, por aprobar, respondido) y días que quedan. Los
   que vencen en dos días hábiles o menos van arriba, marcados.
2. **Caso nuevo.** Marca, canal de entrada (correo, redes, WhatsApp, otro), radicado si existe y el mensaje
   del cliente pegado. La IA propone el tipo, el tema y la urgencia, y la persona confirma. La fecha
   límite se calcula del tipo y de la fecha de recibido.
3. **Responder un caso, de a uno.**
   - Arriba: el mensaje del cliente.
   - Al centro: **«Hechos verificados»**, un campo obligatorio: qué pasó, qué se va a hacer y en qué plazo.
     Sin hechos no se genera.
   - Después: el borrador de la IA con los avisos en el lugar exacto (una promesa que no está en los
     hechos, un tratamiento equivocado, una pregunta del cliente que quedó sin responder).
   - Acciones: «Pedir otra versión», editar, y **«Enviar a aprobar»** como acción principal.
4. **Sugerencia de revisión legal.** Un aviso ámbar, no un bloqueo: «Este caso menciona una demanda.
   Sugerimos que lo revise el área legal antes de responder». La persona puede marcar «Revisado por
   legal», y eso queda en el historial. La revisión ocurre fuera de My Voice.
5. **Aprobar.** El responsable ve el caso, los hechos, la respuesta y los avisos. Aprueba o devuelve con
   un comentario.
6. **Respondido.** Botón «Copiar respuesta» para pegarla en el canal donde se contesta, y «Marcar
   enviada» con la fecha. My Voice no envía nada.

### Reglas

- **La IA no envía ni decide.** Propone el tipo y el borrador; una persona confirma y otra aprueba.
- **Solo se compromete lo que está en los hechos.** Un monto, un plazo, una compensación o una admisión
  que no estén ahí bloquean la aprobación hasta que se corrijan o se agreguen a los hechos.
- **La voz y el tratamiento son los del ADN**, con un registro más cuidadoso que en campañas: menos
  ingenio, más claridad. Una queja no se responde con un juego de palabras.
- **Cada respuesta contesta todo lo que el cliente preguntó.** Si algo queda sin responder, se avisa.
- **Los datos personales no salen de la plataforma sin necesidad.** Antes de enviar el caso al proveedor
  de IA se enmascaran los números de documento, teléfonos, correos y cuentas.
- **Todo queda en el historial único** (decisión 19): caso registrado, tipo confirmado, borrador, avisos,
  revisión legal marcada, aprobación y envío.

### Lo que no hace (por ahora)

- No se conecta a Zendesk, Salesforce ni al sistema de tickets de la marca.
- No envía las respuestas.
- No tiene un portal para la marca ni usuarios externos.
- No reemplaza la revisión legal; solo la sugiere.

## Nivel 2 · Cómo se construye

Se escribe en detalle cuando el nivel 1 esté validado en el `.pen`. Este es el esqueleto.

### Dónde vive

Es un área de **My Voice** (`server/src/myvoice/pqrs/`) que se enciende por marca, como los módulos. Lee el
ADN solo a través de `resolverAdn` (parte común) y no toca campañas, cuadros ni CDM.

### Datos (todo aditivo)

- **Función.** `ATENCION` en `enum FuncionEquipo`, para los avisos, como `DISENO`.
- **Encendido por marca.** Un campo en `Client` o la tabla de módulos encendidos, cuando exista.
- **Sección del ADN.** `atencionAlCliente` en `ClaveAdn` (`server/src/comun/adn/secciones.ts`):
  - `peso: 0`, no crítica, modos `HEREDA` y `PROPIA`;
  - un grupo propio que la pantalla del ADN muestra solo con el área encendida;
  - `completitudAdn.ts` la deja fuera del mínimo.
- **`CasoPqrs`:** `clientId`, `workspaceId`, `tipo` (`PETICION | QUEJA | RECLAMO | SUGERENCIA`), `tema`,
  `urgencia`, `canal`, `radicado?`, `mensaje` (enmascarado), `hechos`, `recibidoEn`, `venceEn`,
  `estado`, `responsableId?`, `revisionLegalSugerida`, `revisionLegalMarcada`.
- **`RespuestaPqrs`:** las versiones del borrador con sus avisos, la aprobada y `enviadaEn`.
- **`CasoPqrsEvento`:** append-only, con el mismo patrón que `PiezaEvento`. Alimenta el historial único.

### Motor

- **Sin director ni revisor de coherencia.** Es una sola etapa: redactor, revisor y, si hace falta,
  corrector, con el patrón de `criticService` y `fixerService`.
- **Prompt nuevo** (`pqrsPrompt.ts`): ADN resuelto con tratamiento, voz, prohibiciones y la sección de
  atención, más el tipo, los hechos y el mensaje enmascarado.
- **Validadores deterministas nuevos**, junto a los de `validators.ts`:
  - montos y plazos que no están en los hechos;
  - frases de admisión o de compensación de la lista de «lo que nunca se promete»;
  - tratamiento (se reusa `tuteoHits`).
- **El revisor suma tres señales:** pregunta sin responder, tono inadecuado para el tipo y riesgo legal
  (demanda, SIC, tutela, abogado, salud, daño a la propiedad). El riesgo legal solo sugiere; no bloquea.
- **Clasificador del caso** con el modelo económico (`MINI_MODELS`): tipo, tema y urgencia propuestos.
- **Enmascarado** de datos personales antes de cualquier llamada, con expresiones regulares (documento,
  teléfono, correo, cuenta). El texto completo queda solo en la base.
- **Todo pasa por `chatCompletionConRetry`** (`aiClient.ts`) y registra su costo como `GenerationLog`,
  con un `tipo` que separe PQRS de campañas en `/analytics/usage`.

### Plazos

La fecha límite se calcula en días hábiles colombianos desde `recibidoEn`. Valores iniciales, a
confirmar con el equipo de atención:

| Tipo | Plazo inicial |
|---|---|
| Petición | 15 días hábiles (Ley 1755 de 2015) |
| Queja, reclamo | 15 días hábiles |
| Sugerencia | Sin plazo legal; se ordena al final |

Cada marca podrá ajustar sus plazos en la sección de atención si su política es más corta.

### Permisos y aislamiento

- Un solo archivo de permisos, como `permisosPieza.ts`.
- Guards de `lib/tenancy.ts`: un caso de otro workspace responde 404.
- `verify:isolation` suma: un caso de otro workspace no se lee ni se aprueba, y la bandeja no mezcla
  workspaces.

### Fases

| Fase | Qué entrega | Depende de |
|---|---|---|
| P0 | Diseño en el `.pen` y prueba de redacción: 20 casos reales anonimizados contra el ADN de una marca, juzgados con `verify:calidad` adaptado | ADN 2.0 |
| P1 | Sección del ADN, encendido por marca, caso nuevo, respuesta y aprobación, copiar y marcar enviada | P0 |
| P2 | Bandeja con plazos, avisos de vencimiento en la cola y reporte mensual por marca (casos, tipos, tiempos) | P1 |
| P3 | Integración con el sistema de tickets, si el volumen lo pide | volumen real |

### Cómo se mide

| Qué | Meta |
|---|---|
| Respuestas aprobadas con un compromiso que no estaba en los hechos | 0 |
| Respuestas con el tratamiento equivocado | 0 |
| Casos que vencen sin respuesta | 0 |
| Tiempo desde que se pega el caso hasta el borrador | Menos de 30 s |
| Respuestas aprobadas sin editar o con una edición menor | A medir en el piloto |

## Preguntas abiertas

- ¿La persona que redacta puede aprobar su propia respuesta, o siempre aprueba otra? En piezas, quien
  sube no decide (decisión de 2026-11-05).
- ¿Qué plazos usa hoy el equipo de atención, por tipo y por marca?
- ¿Con qué marca se hace el piloto y de dónde salen los 20 casos de prueba?
