# Guión — video de 1 minuto sobre My Voice

> Para producir en **Remotion**. **Horizontal 1920×1080**, 30 fps, **1800 frames**.
> Las capturas ya están exportadas del `.pen` en `design/exports/` (PNG 2x, horizontales).
>
> Estado: **guión cerrado, sin producir.**
>
> **Sin locución: solo texto y música.** El texto en pantalla carga toda la historia, así que es
> grande, corto y entra con el ritmo de la pista.

## Decisiones tomadas

| | |
|---|---|
| **Formato** | Horizontal 1920×1080. Las capturas ya son horizontales: se ven enteras, sin recortes forzados |
| **Voz** | Sin locución. Texto y música |
| **Marcas** | Se mantienen Vive Terpel y LoBueno. Son campañas que existieron, y eso le saca el aire de demo |
| **Velocidad** | Los tiempos de abajo son la base. **Se ajustan al montar con la música**, moviendo los cortes al beat |
| **Captura en movimiento** | Pendiente: grabar el tablero real moviendo una tarjeta, para la escena 12 |

## La idea

No es un tour de funcionalidades. Es **una campaña atravesando la herramienta de punta a punta**,
que es lo que ninguna otra hace: del ADN de marca al copy, del copy aprobado a la pieza asignada,
y de la pieza a la verificación. Un tour se abandona a los diez segundos; una campaña que avanza
se mira hasta el final.

**La promesa, en una frase:** *una marca, un brief, catorce canales — y cada pieza verificada
contra lo que se aprobó.*

## Las cinco reglas del ritmo

Lo que hace que un video se sienta dinámico no es la velocidad: es que **nunca haya un plano
quieto**. Estas cinco reglas valen más que cualquier tiempo de la tabla.

1. **Ningún plano pasa de 5 segundos.** El promedio es 3. Son 19 planos en 60 segundos.
2. **Siempre hay algo en movimiento, y solo una cosa.** O se mueve la captura o se mueve el
   texto. Los dos a la vez marean y no se lee ninguno.
3. **El texto no aparece: entra.** Desde el borde, empujando al anterior fuera de cuadro. Nada de
   fundidos de opacidad, que es lo que hace ver lento un video.
4. **Dos transiciones, cada una con su significado.** *Whip pan* horizontal entre pantallas del
   mismo bloque —es la misma idea que sigue—; **corte seco** entre bloques, y ahí cambia también
   el color de fondo.
5. **Los cortes caen en el beat.** Por eso la velocidad se ajusta al final, con la pista puesta:
   mover un corte tres frames es la diferencia entre prolijo y vivo.

## El texto, que era el problema

En la primera versión las frases iban en una barra con degradado al pie y **el ojo se iba**:
flotaban sobre una pantalla llena de información, sin un borde que dijera dónde empezaba el
texto. Cuatro cambios lo arreglan, y los cuatro son tipográficos antes que de movimiento.

1. **Inter se carga de verdad.** Declararla en un `fontFamily` no alcanzaba: el navegador que
   renderiza no la tiene instalada y caía en Helvetica, que es más ancha y desarma todos los
   espaciados. Se notaba sin saber por qué.
2. **El texto vive en un panel sólido**, anclado abajo a la izquierda, con una barra de color al
   costado. Deja de flotar: tiene un lugar, y es el mismo en los quince planos, así que el ojo
   aprende dónde mirar y deja de buscar.
3. **Un velo sobre toda la captura**, no un degradado al pie: baja el contraste de la pantalla
   entera para que el texto gane siempre, sin depender de qué haya detrás en ese plano.
4. **Un rótulo en versalitas** arriba de cada frase —EL ADN, EL MOTOR, LA REGLA— que funciona
   como entrada de lectura y, de paso, dice en qué parte del recorrido estamos.

Y **tres tamaños, ninguno más**: 118 px cuando el texto está solo en pantalla, 58 px sobre una
captura, 30 px de apoyo. Un video de un minuto con cinco escalas parece hecho por cinco personas.

## Línea de tiempo

21 planos, promedio de 2,9 s y ninguno de más de 5.

| # | Frames | Dur | Plano | Texto |
|---|---|---|---|---|
| 1–4 | 0–240 | 8 s | Negro | «Una campaña.» · «14 canales.» · «40 piezas de copy.» · «Y el lunes a las 9.» |
| 5 | 240–330 | 3 s | **Para quién es** | «Agencias y equipos de marca que manejan varias marcas y muchos canales a la vez.» |
| 6 | 330–435 | 3,5 s | `02-marcas-adn` | EL ADN DE LA MARCA · «Su voz, y lo que nunca diría» |
| 7 | 435–510 | 2,5 s | `03-generar` | EL BRIEF · «Un brief. Una vez.» |
| 8 | 510–615 | 3,5 s | `04-progreso` | EL MOTOR · «Cuatro roles de IA, 14 canales a la vez» |
| 9 | 615–690 | 2,5 s | `05-resultados` | EL COPY · «Con el largo exacto de cada canal» |
| 10 | 690–765 | 2,5 s | `06-biblioteca` | LA BIBLIOTECA · «Todo aprobado, en un solo lugar» |
| 11 | 765–840 | 2,5 s | `07-revisiones` | LA APROBACIÓN · «Un enlace para el cliente» |
| 12 | 840–915 | 2,5 s | `08-portal-cliente` | EL PORTAL · «Aprueba sin crear una cuenta» |
| 13 | 915–1020 | 3,5 s | `09-tablero` | LA PRODUCCIÓN · «Lo aprobado se vuelve trabajo asignado» |
| 14 | 1020–1095 | 2,5 s | `10-orden-trabajo` | LA ORDEN DE TRABAJO · «El diseñador recibe el copy exacto» |
| 15 | 1095–1170 | 2,5 s | `10-orden-trabajo` | EL BRIEF VISUAL · «Y la idea que el motor ya escribió» |
| 16 | 1170–1320 | 5 s | **Pantalla partida** | «La IA revisa la pieza terminada» · aprobado vs. en la pieza |
| 17 | 1320–1395 | 2,5 s | `11-auditoria` | LA REGLA · «Avisa. No bloquea. Decide una persona.» |
| 18 | 1395–1515 | 4 s | **El dato** | LO QUE CAMBIA · **60 %** menos tiempo por campaña |
| 19 | 1515–1590 | 2,5 s | `13-metricas` | EL COSTO · «Con el costo de cada campaña a la vista» |
| 20 | 1590–1695 | 3,5 s | Mosaico | «Del brief a la pieza verificada» |
| 21 | 1695–1800 | 3,5 s | Cierre | «My Voice» · `myvoice.lobueno.co` |

---

## Plano por plano

### Bloque 1 · El problema — frames 0–240

Fondo `#1D1D1F`, texto blanco de 120 px centrado. **Cada línea entra desde abajo y empuja a la
anterior hacia arriba**, que queda en gris `#6E6E73` y más chica. Al llegar la cuarta, las tres
anteriores están apiladas arriba y la nueva ocupa el centro.

En el frame **236** todo se va a blanco de golpe, en cuatro frames. Ese flash es la bisagra del
video: termina el problema, empieza el producto.

### Bloque 2 · El copy — frames 240–720

Fondo `#F5F5F7`. Las capturas entran a sangre, **ocupando el ancho completo**, con el texto sobre
una barra inferior semitransparente. Entre planos de este bloque, *whip pan* de 6 frames.

- **5 · El ADN** (`02-marcas-adn`) — La captura hace un *push in* lento, de 1.0 a 1.06. A los
  20 frames, un recuadro redondeado resalta el campo **prohibiciones**, y una etiqueta chica dice
  «lo que la marca nunca diría».
- **6 · El brief** (`03-generar`) — La cámara baja por el formulario. Los chips de canales se
  encienden de a uno cada 3 frames hasta quedar los catorce: ahí se entiende la escala sin decir
  un número.
- **7 · El motor** (`04-progreso`) — El plano más largo, y el corazón del producto. Las barras de
  los canales se completan en cascada, desfasadas 5 frames. Sobre ellas, cuatro etiquetas entran y
  salen: **Director · Redactor · Editor · Auditor**, una cada 25 frames.
- **8 · Los resultados** (`05-resultados`) — Zoom a una fila. Un contador de caracteres sube y
  **frena justo debajo del límite**, que es la promesa del producto en un solo gesto.
- **9 · La biblioteca** (`06-biblioteca`) — Paneo lateral rápido sobre la tabla. Los sellos de
  *Aprobado* aparecen en cascada.

### Bloque 3 · El cliente — frames 720–900

Corte seco. Fondo `#FFFFFF`.

- **10 · Revisiones** (`07-revisiones`) — Un enlace sale de la pantalla y cruza el cuadro.
- **11 · El portal** (`08-portal-cliente`) — La captura entra desde la derecha. Dos sellos caen:
  *Aprobado* en verde, *Pide cambios* en ámbar. El texto aclara lo que más sorprende: **sin
  cuenta, sin contraseña**.

### Bloque 4 · La producción — frames 900–1200

Corte seco. Fondo `#1D1D1F` otra vez, para marcar que acá empieza la parte que ninguna otra
herramienta tiene.

- **12 · El tablero** (`09-tablero`) — Las cuatro columnas entran de izquierda a derecha, una cada
  10 frames. En el frame **985**, una tarjeta se desplaza de *Por asignar* a *En diseño*. **Si se
  graba el tablero real en movimiento, este plano se reemplaza por el video**: una tarjeta que se
  mueve de verdad vale más que la misma animada sobre una imagen fija.
- **13 · La orden de trabajo** (`10-orden-trabajo`) — Zoom al bloque de copy. Un cursor lo
  selecciona y aparece el chip **Copiado**.
- **14 · El brief visual** (`10-orden-trabajo`) — La cámara baja al brief de producción, con la
  etiqueta «lo escribió el motor junto con el copy».

### Bloque 5 · La verificación — frames 1200–1440

El plano que justifica el video entero. Fondo `#1D1D1F`.

- **15 · El hallazgo** (`11-auditoria`) — **Pantalla partida, que es lo que el formato horizontal
  hace posible**: a la izquierda el copy aprobado, a la derecha lo que la IA leyó en la pieza. Las
  dos palabras que difieren se marcan en ámbar y una línea las conecta. Cinco segundos, el plano
  más largo del video, porque es el único que hay que leer.
- **16 · La regla** (`11-auditoria`) — Zoom out al informe completo. El texto entra en tres
  tiempos: «Avisa.» / «No bloquea.» / «Decide una persona.»

### Los dos planos que no muestran pantalla

**Para quién es** (plano 5) va **antes del producto, no al final**: si alguien se va a los diez
segundos, que al menos sepa si el video le hablaba a él.

**El dato** (plano 18) va **después** de mostrar el recorrido completo, por la razón contraria: un
número sin el recorrido detrás es una promesa; con el recorrido detrás es una conclusión. El
número sube desde cero y frena —uno que ya está puesto se lee, uno que llega se mira— y lleva su
letra chica: **«Estimación del equipo sobre su propio flujo de trabajo»**. Decirlo cuesta una
línea y es lo que separa un dato de una promesa.

### Bloque 6 · Cierre — frames 1440–1800

- **17 · El costo** (`13-metricas`) — Paneo sobre el tablero de métricas. Un número de costo sube
  y se detiene. Dice lo que un director quiere oír: esto se mide.
- **18 · El mosaico** — Las once pantallas pasan en grilla a velocidad alta, 8 frames cada una,
  encogiéndose hacia el centro.
- **19 · El logo** — Negro. **My Voice** entra desde abajo, la bajada «Del brief a la pieza
  verificada» aparece debajo, y la URL queda 60 frames en pantalla: el tiempo mínimo para que
  alguien la anote.

---

## Cómo se arma en Remotion

```
video/
  src/
    Root.tsx            ← composición: 1920×1080, 30 fps, 1800 frames
    Reel.tsx            ← <Series> con los 19 planos y sus duraciones
    planos/
      Titular.tsx       ← los cuatro planos de texto sobre negro
      Pantalla.tsx      ← captura a sangre + barra de texto + push in / paneo
      Partida.tsx       ← el plano 15: dos columnas comparadas
      Mosaico.tsx       Cierre.tsx
    componentes/
      TextoQueEmpuja.tsx  ← entra desde el borde y desplaza al anterior
      Resalte.tsx         ← el recuadro redondeado que señala una zona
      Contador.tsx        ← el número que sube y frena
      WhipPan.tsx         ← la transición de 6 frames entre planos del mismo bloque
  public/pantallas/     ← copiar acá design/exports/*.png
```

**Tres decisiones antes de escribir código:**

1. **Las duraciones viven en un solo array**, el de `<Series>`. Ajustar el ritmo con la música
   tiene que ser cambiar números en una lista, no tocar diecinueve componentes.
2. **Una sola escala tipográfica**, la del producto: 120 px en los titulares sobre negro, 56 px
   en las barras de texto sobre capturas, Inter. El video se tiene que ver como la herramienta.
3. **El zoom y el paneo se declaran en coordenadas relativas** de la captura, no en píxeles: las
   capturas tienen tamaños distintos y así el mismo componente sirve para todas.

## Qué falta para producirlo

- [ ] **Elegir la música**, y que tenga un corte marcado cerca del segundo 8: ahí va el flash a
      blanco que separa el problema del producto.
- [ ] Montar, y **recién entonces ajustar los tiempos** para que los cortes caigan en el beat.
- [ ] **Grabar el tablero real en movimiento** para el plano 12 (pendiente).
- [ ] Decidir si hay subtítulos de apoyo. Sin locución no hacen falta, pero en LinkedIn el texto
      grande a veces se recorta en la previsualización.
