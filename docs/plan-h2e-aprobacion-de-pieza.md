# Plan H2.E — La segunda ronda: el cliente aprueba la pieza

> Hoy el cliente aprueba un texto y nunca ve el arte final. Esto agrega una segunda ronda sobre
> la pieza terminada, con el feedback desglosado en copy y diseño.
> Estado: **nivel 2 escrito** el 2026-09-24. Nivel 1 dibujado en `§ H2.E · …` del `.pen`.
> Listo para construir.

## El hueco

El recorrido del producto tiene seis etapas y el cliente participa en una sola: aprueba el copy
antes de que se produzca. `ReviewSessionItem` apunta a `SavedVariation` y a nada más, así que
**por la herramienta no pasa nunca la pieza terminada delante del cliente**. Quien mira el arte
es el aprobador interno, en la columna «Por revisar» del tablero.

En la práctica eso significa que el cliente aprueba una frase y después ve el resultado por
WhatsApp, por correo, o directamente publicado. El feedback que da ahí no vuelve a ninguna parte.

## Decisiones

**D1 · Se agrega una ronda; la que existe no se mueve — DECIDIDA.**

La tentación es mover la aprobación al final: el cliente ve el producto terminado y opina una sola
vez. No, por tres razones, y la primera alcanza:

1. **Pone la decisión del cliente después del gasto.** Hoy es copy → cliente aprueba → se diseña.
   Si el cliente recién decide sobre la pieza, el diseñador produce sobre un mensaje que el cliente
   no vio, y cuando rechace el mensaje lo que se tira no es un texto: es el trabajo de diseño. Es
   exactamente el retrabajo que el producto existe para evitar.
2. **Envenena el aprendizaje.** Hoy el rechazo del cliente entra automático al motor
   (`NegativeFeedback.reason`). Si el rechazo pasa a ser sobre la pieza, la mitad de los motivos
   van a ser visuales —«el logo muy chico»— y eso alimentando un motor de texto lo empeora.
3. **Cuatro canales no tienen pieza que mirar.** Reel, TikTok, YouTube y Cuña de Radio se entregan
   **por enlace**, no por archivo: el tope de 10 MB de D6 del H2 no da para video. Ahí el cliente
   vería un link de Drive, no una previa.

| Ronda | Qué aprueba | Cuándo | Para qué sirve |
|---|---|---|---|
| **1** *(existe)* | El mensaje | Antes de producir | Proteger el costo de diseño. Alimenta el motor. |
| **2** *(nueva)* | La pieza terminada | Después del visto bueno interno | Que el cliente vea el producto final antes de publicar |

**D2 · La ronda 2 va después del aprobador interno, no antes — DECIDIDA.**
No se le manda al cliente una pieza con hallazgos sin resolver. La auditoría y el visto bueno
interno son control de calidad; el cliente ve lo que la agencia ya respalda. En la máquina de
estados eso es: la ronda 2 sale desde `LISTA`.

**D3 · Es opcional, y se decide por campaña — DECIDIDA.**
Obligatoria significa una columna más en el tablero y un ida y vuelta más en cada pieza. Hay
clientes que quieren ver el arte y otros que ya aprobaron el mensaje y no quieren otra reunión.
Por defecto **apagada**: una pieza `LISTA` sigue estando lista.

**D4 · El feedback se desglosa en copy y diseño — DECIDIDA.**

Es la decisión que hace que todo lo demás funcione: **el desglose es el enrutador**. Lo de copy va
al motor, lo de diseño va al diseñador, y nadie tiene que triar a mano.

Tres reglas sobre el formulario, y las tres son sobre no pedir de más:

1. **Los dos campos van opcionales.** Nunca los dos obligatorios. El portal vale porque no tiene
   fricción —sin cuenta, sin contraseña—; dos cajas obligatorias hacen que la gente llene una y
   ponga «ok» en la otra, y ahí se perdió la señal que se venía a buscar.
2. **También se puede comentar al aprobar.** «Lo apruebo, pero para la próxima cuidemos el
   contraste» es información que hoy se pierde entera, porque el comentario solo tiene sentido al
   rechazar.
3. **Dos categorías y ninguna más.** La tentación va a ser copiar las de la auditoría —texto,
   marca, legal, medidas—, pero esa es una taxonomía para la máquina. El formulario lo llena una
   persona que quiere terminar rápido, y **dos categorías son dos equipos que lo reciben**. En
   cuanto hay cinco, nadie elige bien.

**D5 · El enrutamiento es asimétrico entre rondas — DECIDIDA.**

Una clasificación equivocada es peor que ninguna: si el cliente etiqueta como «copy» algo que era
de diagramación y eso entra solo al motor, se le enseña basura a la IA.

| | Feedback de copy | Feedback de diseño |
|---|---|---|
| **Ronda 1** | Entra **automático** al motor | *(no aplica: no hay pieza)* |
| **Ronda 2** | Entra como **propuesta**; alguien de adentro confirma | Va al diseñador con la pieza |

En la ronda 1 todo es copy por construcción, así que el automatismo se ganó la autoridad. En la
ronda 2 todavía no — mismo criterio que D2 de la auditoría.

**D6 · Un cambio de mensaje en la ronda 2 no desaprueba el copy solo — DECIDIDA.**
Va a pasar: ver la pieza es cuando la gente se da cuenta de lo que aprobó. Pero desaprobar el copy
automáticamente arrastra la Biblioteca, las piezas hermanas y el texto congelado de todas ellas.
Se avisa y decide una persona, igual que con los desfases de copy que ya existen.

**Y el formulario tiene que decir lo que cuesta.** Feedback de diseño es **un paso atrás** —la
pieza vuelve a En diseño—. Feedback de copy son **dos**: hay que cambiar el copy aprobado y
rehacer la pieza. Decirlo en el momento de escribirlo probablemente baje los cambios de mensaje
de último momento, que son los caros.

**D7 · El mismo desglose se usa en la ronda interna — DECIDIDA.**
Hoy `devolver` lleva una sola `nota`. Si el aprobador interno usa las mismas dos categorías, el
diseñador recibe siempre el feedback en la misma forma, venga de adentro o del cliente. Es
consistencia barata.

## Lo que hay que cuidar

**Todo lo alcanzable desde una sesión de revisión es efectivamente público.** Está escrito en
`CLAUDE.md` y es la regla que más importa acá: meter piezas en una sesión expone sus imágenes
detrás del token. Las URLs de snapshot ya son firmadas y vencen, así que la base está — pero el
armado de la sesión tiene que filtrar por workspace igual que hoy, y `verify:isolation` tiene que
sumar el caso.

**Video y audio no tienen previa.** Para los cuatro canales que se entregan por enlace, la ronda 2
muestra el enlace y el copy aprobado, no una imagen. Hay que decidir en el dibujo si eso se ve
como una tarjeta distinta o como la misma con un hueco.

---

# Nivel 1 · Dibujado

Cuatro secciones en el `.pen`: `§ H2.E · El portal, ronda 2`, `§ H2.E · Armar la ronda 2`,
`§ H2.E · Lo que vuelve` y `§ H2.E · Estados límite`.

## Lo que resolvió el dibujo

**El copy aprobado va al lado de la pieza, no detrás de un clic.** Sin eso el cliente compara la
pieza contra lo que recuerda haber aprobado, y lo que recuerda nunca es lo que aprobó. Con los
tres slots a la vista, «esto no es lo que dijimos» se vuelve verificable en el momento.

**El formulario dice lo que cuesta, en el formulario.** La línea «un cambio de diseño vuelve a
producción; un cambio de mensaje vuelve dos pasos» va debajo de las dos cajas, no en un tooltip:
es la única forma de que la lea quien está por escribir.

**Los dos campos se ven distintos entre sí antes de leerlos**, por el punto de color —azul el
copy, violeta el diseño—. Es el mismo código de color de las etapas del producto, así que el
punto ya dice adónde va ese texto.

**La propuesta de copy se ve como propuesta.** Sello «sin confirmar» en ámbar y dos botones
explícitos. Si llegara sin sello, nadie se enteraría de que hay una decisión pendiente y el
feedback moriría ahí.

**El interruptor de la ronda 2 vive en la campaña, no en el workspace.** Dibujarlo obligó a
decidirlo: una agencia tiene clientes que quieren ver el arte y clientes que no, y esa diferencia
es por campaña.

## Los cinco estados límite

1. **Una pieza de video o audio**, sin previa que mostrar.
2. **El cliente aprueba con comentario.** No es un rechazo: la pieza sigue Lista y el comentario
   queda.
3. **El cliente solo llena una de las dos cajas**, que va a ser el caso más común.
4. **Feedback de copy en la ronda 2**: cómo se ve la propuesta antes de que alguien la confirme, y
   qué pasa con el copy aprobado mientras tanto.
5. **La campaña no activó la ronda 2** (D3): la pieza llega a Lista y ahí termina, sin que la
   pantalla sugiera que falta un paso.

---

---

# Nivel 2 · Cómo se construye

## Lo que NO cambia, que es la decisión más importante de este nivel

**No hay quinta columna.** Una pieza que está con el cliente sigue en `LISTA`. El «esperando» es
una propiedad de la sesión de revisión, no de la pieza.

Si fuera un estado habría que darle lo que D5 del H2 le exige a cada columna —un dueño y una
acción que la vacía— y el dueño sería alguien que no entra a la herramienta. Una columna que solo
se vacía cuando alguien de afuera contesta no es una columna: es una sala de espera, y el tablero
dejaría de responder «cuánto lleva esto acá» para empezar a mentir.

**Y cuando el cliente pide cambios de arte no hace falta una transición nueva:** `reabrir` ya va
de `LISTA` a `EN_DISENO` y ya exige motivo.

## Modelo

```prisma
enum RondaRevision { COPY  PIEZA }

model ReviewSession {
  /// Una sesión es homogénea: o lleva copy o lleva piezas, nunca las dos.
  /// Con un solo campo acá, los items no necesitan validarse de a uno.
  ronda RondaRevision @default(COPY)
}

model ReviewSessionItem {
  /// Uno de los dos, según la ronda de la sesión. Prisma no expresa el XOR;
  /// lo sostienen el servicio y un CHECK en la migración.
  savedVariationId String?
  piezaId          String?
}

model ReviewItemFeedback {
  savedVariationId String?
  piezaId          String?
  decision         ReviewDecision
  /// `comment` se RENOMBRA a `feedbackCopy`: en la ronda 1 todo comentario es
  /// sobre copy, así que la columna ya era eso sin decirlo. Renombrar en vez de
  /// agregar evita tener dos campos que significan lo mismo.
  feedbackCopy   String?
  feedbackDiseno String?
}

model NegativeFeedback {
  /// NULL = propuesta sin confirmar. El motor solo lee las confirmadas (D5).
  /// La migración pone `createdAt` en las filas que ya existen: vienen de la
  /// ronda 1 y ya estaban surtiendo efecto.
  confirmadoAt DateTime?
}

model PiezaEvento {
  /// COPY · DISENO. Una devolución con las dos categorías deja DOS eventos,
  /// no uno con dos campos: el historial es append-only y cada entrada tiene
  /// un destinatario distinto.
  categoria String?
}

model Project {
  /// D3. Apagado = la campaña se comporta como hoy.
  pideAprobacionDeCliente Boolean @default(false)
}
```

## Qué pasa al recibir la ronda 2

Por cada pieza de la entrega, y en este orden:

| Lo que mandó el cliente | Qué pasa con la pieza | Qué pasa con el feedback |
|---|---|---|
| Aprobada, sin comentarios | Sigue `LISTA` | — |
| Aprobada, con comentarios | Sigue `LISTA` | Un `PiezaEvento` por categoría |
| Cambios, con feedback de diseño | `reabrir` → `EN_DISENO` | Evento `DEVUELTA` categoría `DISENO`; le avisa al diseñador |
| Cambios, solo feedback de copy | **Sigue `LISTA`** | `NegativeFeedback` sin confirmar + evento categoría `COPY` |

La última fila es la que hay que mirar dos veces. **Una pieza cuyo problema es el mensaje no
vuelve sola a diseño**, porque el diseñador no puede hacer nada hasta que el copy cambie:
mandársela sería ponerle en el tablero trabajo que no existe todavía.

Lo que pasa en cambio es que la propuesta queda esperando. Cuando alguien la confirma y edita el
copy en la Biblioteca, **el mecanismo de desfase que ya existe** hace saltar el aviso «el copy
cambió después de mandarla a producir» en esa pieza y en sus hermanas — y ahí quien produce decide
si la reabre. Cero estado nuevo, y la decisión queda donde D6 la puso: en una persona.

## Endpoints

| | |
|---|---|
| `POST /review-sessions` | gana `ronda` y `piezaIds`. Rechaza mezclar copys y piezas. |
| `GET /review/public/:token` | cuando `ronda = PIEZA` devuelve, por pieza: la URL firmada del snapshot, el formato, y **el copy congelado** de sus slots |
| `POST /review/public/:token/submit` | acepta `{ piezaId, decision, feedbackCopy?, feedbackDiseno? }`. Al menos uno de los dos textos si `decision = REJECTED` |
| `POST /piezas/:id/devolver` · `/reabrir` | ganan `notaCopy` / `notaDiseno` (D7). `nota` sigue aceptándose y se guarda **sin categoría** |
| `GET /feedback/propuestas` | las propuestas sin confirmar del workspace |
| `POST /feedback/propuestas/:id/confirmar` · `/descartar` | `requireManager`: decide qué aprende el motor |
| `PATCH /projects/:id` | el interruptor de D3. Hoy `projects` no tiene update: hay que agregarlo con `pickFields()` |

## Criterio de aceptación

- Una campaña con el interruptor apagado se comporta **exactamente** como hoy: la columna Lista
  no muestra el botón y la pieza termina ahí.
- Una sesión de ronda 2 muestra la pieza **con el copy aprobado al lado**, sin cuenta.
- El cliente puede aprobar dejando comentario: la pieza sigue `LISTA` y el comentario queda en el
  historial con su categoría.
- Un rechazo con feedback de diseño devuelve la pieza a `EN_DISENO` y le avisa al diseñador
  asignado.
- Un rechazo con **solo** feedback de copy **no** mueve la pieza y **no** desaprueba el copy.
- Una generación no ve ninguna propuesta sin confirmar: `generateController` sigue leyendo solo
  las diez últimas **confirmadas**.
- Una sesión no puede mezclar copys y piezas.
- `verify:isolation` suma tres casos: una pieza de otro workspace no entra en una sesión; el token
  de una sesión no devuelve ninguna pieza que no sea suya; y confirmar una propuesta de otro
  workspace responde 404.

> **Corrección sobre la primera versión de este plan.** Decía que una `nota` suelta se guardaría
> como `COPY`. Está mal por la misma razón que D5: inventarle una categoría a algo que nadie
> clasificó es una clasificación equivocada, y una equivocada es peor que ninguna. Además el
> destinatario de una devolución es el diseñador, así que si hubiera que adivinar, `COPY` sería
> justo la peor apuesta. `NULL` significa «nadie lo clasificó», que es cierto.

## Fases

1. **El desglose interno** · ✅ **construida** el 2026-09-24 — `PiezaEvento.categoria`, las dos
   notas en `devolver` y `reabrir`, y el renombre de `comment` a `feedbackCopy`. No toca el portal público y entrega valor sola:
   el diseñador ya recibe el feedback separado, venga de quien venga.
2. **La ronda 2** · ✅ **construida** el 2026-09-24 — `ronda` en la sesión, la pieza en el item
   con un CHECK que sostiene el XOR, `services/revisionDePiezas.ts` con la tabla de decisiones,
   `components/RevisionDePiezas.tsx` como pantalla aparte, el interruptor por campaña y el botón
   en la columna Lista. `verify:isolation` pasa a 84 casos.

   Lo que el código obligó a decidir y no estaba en el nivel 2: **`PiezaEvento.autorId` pasa a ser
   nullable**, con un `autorExterno` al lado. El cliente no tiene cuenta, y atribuirle sus palabras
   a quien mandó el enlace sería mentir en el único registro que responde «quién decidió esto».
3. **El enrutamiento** — `confirmadoAt`, el filtro del motor, y la bandeja de propuestas (D5).
   Va tercera a propósito: hasta que exista, la ronda 2 simplemente no crea `NegativeFeedback`, y
   eso es más seguro que crearlos sin poder confirmarlos.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El cliente clasifica mal y el motor aprende basura | D5: en la ronda 2 el feedback de copy es propuesta, no ingesta |
| Una ronda más alarga cada campaña | D3: opcional por campaña, apagada por defecto |
| El formulario baja la tasa de respuesta | D4: los dos campos opcionales, y se puede aprobar sin escribir nada |
| Las imágenes de las piezas quedan expuestas | Filtrado por workspace al armar la sesión + URLs firmadas que vencen, y el caso en `verify:isolation` |
| Se pide una tercera y una cuarta categoría | D4 regla 3 lo deja escrito: dos categorías son dos equipos |
