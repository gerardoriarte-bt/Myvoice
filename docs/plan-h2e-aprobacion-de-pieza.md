# Plan H2.E — La segunda ronda: el cliente aprueba la pieza

> Hoy el cliente aprueba un texto y nunca ve el arte final. Esto agrega una segunda ronda sobre
> la pieza terminada, con el feedback desglosado en copy y diseño.
> Estado: **nivel 1 dibujado** el 2026-09-24, en `§ H2.E · …` del `.pen`. Falta el nivel 2.

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

# Fases

1. **El modelo y el desglose interno** — las dos categorías en `devolver` (D7). Entrega valor
   sola y no toca el portal público.
2. **La ronda 2** — `ReviewSessionItem` apuntando a una pieza, el portal con la pieza y el
   formulario, y la vuelta al tablero.
3. **El enrutamiento** — la propuesta de feedback de copy y su confirmación (D5).

## Criterio de aceptación

- Una campaña sin ronda 2 se comporta exactamente como hoy: la pieza llega a Lista y termina.
- Una pieza en Lista se puede mandar al cliente, y el cliente la ve **con el copy aprobado al
  lado**, sin cuenta.
- El cliente puede aprobar dejando un comentario, y la pieza sigue Lista.
- Un rechazo con feedback de diseño devuelve la pieza a En diseño con el motivo, y le avisa al
  diseñador (H3.D ya sabe hacer eso).
- Un rechazo con feedback de copy **no** desaprueba el copy en la Biblioteca (D6): deja una
  propuesta.
- Ninguna propuesta de copy llega al motor sin que alguien de adentro la confirme.
- `verify:isolation` suma: una pieza de otro workspace no se puede meter en una sesión de
  revisión, y el token de una sesión no da acceso a ninguna otra pieza.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El cliente clasifica mal y el motor aprende basura | D5: en la ronda 2 el feedback de copy es propuesta, no ingesta |
| Una ronda más alarga cada campaña | D3: opcional por campaña, apagada por defecto |
| El formulario baja la tasa de respuesta | D4: los dos campos opcionales, y se puede aprobar sin escribir nada |
| Las imágenes de las piezas quedan expuestas | Filtrado por workspace al armar la sesión + URLs firmadas que vencen, y el caso en `verify:isolation` |
| Se pide una tercera y una cuarta categoría | D4 regla 3 lo deja escrito: dos categorías son dos equipos |
