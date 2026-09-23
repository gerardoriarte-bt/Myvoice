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

## Línea de tiempo

| # | Frames | Dur | Plano | Texto en pantalla |
|---|---|---|---|---|
| 1 | 0–60 | 2 s | Negro | «Una campaña.» |
| 2 | 60–120 | 2 s | Negro | «14 canales.» |
| 3 | 120–180 | 2 s | Negro | «40 piezas de copy.» |
| 4 | 180–240 | 2 s | Negro → blanco | «Y el lunes a las 9.» |
| 5 | 240–330 | 3 s | `02-marcas-adn` | «Primero, quién es la marca» |
| 6 | 330–420 | 3 s | `03-generar` | «Un brief. Una vez.» |
| 7 | 420–540 | 4 s | `04-progreso` | «Cuatro roles de IA, 14 canales a la vez» |
| 8 | 540–630 | 3 s | `05-resultados` | «Con el largo exacto de cada canal» |
| 9 | 630–720 | 3 s | `06-biblioteca` | «Todo aprobado, en un solo lugar» |
| 10 | 720–810 | 3 s | `07-revisiones` | «Un enlace para el cliente» |
| 11 | 810–900 | 3 s | `08-portal-cliente` | «Aprueba sin crear una cuenta» |
| 12 | 900–1020 | 4 s | `09-tablero` | «Y lo aprobado se vuelve trabajo asignado» |
| 13 | 1020–1110 | 3 s | `10-orden-trabajo` | «El diseñador recibe el copy exacto» |
| 14 | 1110–1200 | 3 s | `10-orden-trabajo` | «Y la idea visual que el motor ya escribió» |
| 15 | 1200–1350 | 5 s | `11-auditoria` | «La IA revisa la pieza terminada» |
| 16 | 1350–1440 | 3 s | `11-auditoria` | «Avisa. No bloquea. Decide una persona» |
| 17 | 1440–1530 | 3 s | `13-metricas` | «Con el costo de cada campaña a la vista» |
| 18 | 1530–1650 | 4 s | Mosaico | «Del brief a la pieza verificada» |
| 19 | 1650–1800 | 5 s | Cierre | «My Voice» · `myvoice.lobueno.co` |

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
