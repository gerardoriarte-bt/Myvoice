# Guión — reel de 1 minuto sobre My Voice

> Para producir en **Remotion**. Formato vertical 1080×1920, 30 fps, **1800 frames** exactos.
> Las capturas de pantalla ya están exportadas del `.pen` en `design/exports/` (2x, PNG).
>
> Estado: **guión cerrado, sin producir.** El proyecto de Remotion queda para una próxima sesión.
>
> El reel se tiene que entender **sin sonido**: el texto en pantalla cuenta la historia completa y
> la locución la refuerza. Así se mira en un feed, y así se muestra en una reunión sin parlantes.

## La idea

No es un tour de funcionalidades. Es **una campaña atravesando la herramienta de punta a punta**,
que es lo que ninguna otra hace: del ADN de marca al copy, del copy aprobado a la pieza, y de la
pieza a la verificación. El tour de features se ve en los primeros diez segundos y se abandona;
una campaña que avanza se mira hasta el final.

**La promesa, en una frase:** *una marca, un brief, catorce canales — y cada pieza verificada
contra lo que se aprobó.*

## Antes de publicarlo

- [x] **Las marcas reales se mantienen.** Decidido el 2026-09-22: las capturas muestran Vive
      Terpel y LoBueno tal cual. Es la versión más fuerte del video —son campañas que existieron—
      y evita el aire de demo que tiene una marca inventada.
- [ ] Los números que aparecen (14 canales, 5 capas) son verdaderos. **No inflarlos**: el producto
      se vende solo con lo que hace.

## Línea de tiempo

| # | Frames | Seg | Escena | Texto en pantalla |
|---|---|---|---|---|
| 1 | 0–150 | 0–5 | Gancho | «Una campaña. 14 canales.» |
| 2 | 150–300 | 5–10 | El problema | «El lunes a las 9.» |
| 3 | 300–450 | 10–15 | El ADN de marca | «Primero, quién es la marca» |
| 4 | 450–600 | 15–20 | El brief | «Un brief. Una vez.» |
| 5 | 600–780 | 20–26 | El motor | «5 capas de IA, 14 canales en paralelo» |
| 6 | 780–930 | 26–31 | Los resultados | «Copy con las medidas de cada canal» |
| 7 | 930–1080 | 31–36 | El cliente aprueba | «El cliente aprueba sin crear una cuenta» |
| 8 | 1080–1260 | 36–42 | El tablero | «Lo aprobado se convierte en trabajo asignado» |
| 9 | 1260–1440 | 42–48 | La orden de trabajo | «El diseñador recibe el copy exacto» |
| 10 | 1440–1650 | 48–55 | La verificación | «Y la IA revisa que la pieza diga lo aprobado» |
| 11 | 1650–1800 | 55–60 | Cierre | «My Voice · del brief a la pieza verificada» |

---

## Escena por escena

### 1 · Gancho — frames 0–150

- **Visual:** fondo `#1D1D1F` a pantalla completa. El texto entra palabra por palabra, una cada
  8 frames. Sin imágenes todavía: el primer segundo compite contra un pulgar.
- **Texto:** «Una campaña.» / «14 canales.» / «40 piezas de copy.»
- **Locución:** «Una campaña. Catorce canales. Cuarenta piezas de copy.»
- **Movimiento:** cada línea entra con `spring` desde abajo, opacidad 0→1, y la anterior baja a
  gris `#6E6E73`. La última queda sola en el centro.

### 2 · El problema — frames 150–300

- **Visual:** las tres líneas anteriores se apilan y encogen; debajo aparece el golpe.
- **Texto:** «Y el lunes a las 9.»
- **Locución:** «Y el lunes a las nueve hay que entregar.»
- **Movimiento:** un corte seco a blanco en el frame 290 marca el cambio de tono: acá termina el
  problema y empieza el producto.

### 3 · El ADN de marca — frames 300–450 · `02-marcas-adn.png`

- **Texto:** «Primero, quién es la marca.» / subtítulo: «Voz, propuesta de valor, prohibiciones.»
- **Locución:** «My Voice arranca por el ADN de la marca: su voz, su propuesta de valor, lo que
  nunca diría.»
- **Movimiento:** la captura entra con un *scale* de 1.08 → 1.0. Se resaltan con un recuadro
  redondeado dos campos: **voz** y **prohibiciones**, con 15 frames de diferencia entre uno y otro.

### 4 · El brief — frames 450–600 · `03-generar.png`

- **Texto:** «Un brief. Una vez.»
- **Locución:** «Cargás el brief una sola vez.»
- **Movimiento:** la captura sube lentamente (parallax de 40 px). Los chips de canales se van
  encendiendo de a uno, cada 4 frames, hasta quedar los catorce prendidos: es el momento en que se
  entiende la escala sin decir un número.

### 5 · El motor — frames 600–780 · `04-progreso.png`

- **Texto:** «Director. Redactor. Editor. Auditor.» / «14 canales en paralelo.»
- **Locución:** «Y adentro trabaja un equipo: un director que define el concepto, un redactor por
  canal, un editor que corrige y un auditor que revisa la coherencia.»
- **Movimiento:** las barras de progreso de cada canal se completan en cascada. Es la escena más
  larga del reel a propósito — es el corazón del producto.

### 6 · Los resultados — frames 780–930 · `05-resultados.png` y `06-biblioteca.png`

- **Texto:** «Con las medidas de cada canal.»
- **Locución:** «Cada pieza sale con el largo exacto que el canal permite, y queda guardada en la
  biblioteca de la marca.»
- **Movimiento:** corte entre las dos capturas en el frame 860. Sobre la primera, un contador de
  caracteres animado que se detiene justo debajo del límite.

### 7 · El cliente aprueba — frames 930–1080 · `07-revisiones.png` y `08-portal-cliente.png`

- **Texto:** «El cliente aprueba sin crear una cuenta.»
- **Locución:** «Se comparte un enlace y el cliente aprueba o pide cambios. Sin cuentas, sin
  cadenas de mail.»
- **Movimiento:** la segunda captura entra como un teléfono sobre la primera. Aparecen dos sellos:
  *Aprobado* en verde, *Pide cambios* en ámbar.

### 8 · El tablero — frames 1080–1260 · `09-tablero.png`

- **Texto:** «Lo aprobado se convierte en trabajo asignado.»
- **Locución:** «Y acá empieza lo que ninguna herramienta de copy hace: lo aprobado se convierte en
  piezas, con un responsable y un estado.»
- **Movimiento:** las cuatro columnas entran de izquierda a derecha, una cada 12 frames. Una
  tarjeta se desplaza de *Por asignar* a *En diseño* en el frame 1200.

### 9 · La orden de trabajo — frames 1260–1440 · `10-orden-trabajo.png`

- **Texto:** «El diseñador recibe el copy exacto.» / «Y el brief visual que el motor ya escribió.»
- **Locución:** «El diseñador abre su orden de trabajo: el copy exacto para copiar y pegar, y la
  idea visual que el motor ya había escrito.»
- **Movimiento:** zoom suave al bloque de copy, y después al brief de producción.

### 10 · La verificación — frames 1440–1650 · `11-auditoria.png`

- **Texto:** «La IA revisa que la pieza diga lo aprobado.» / «Y que respete la marca.»
- **Locución:** «Cuando la pieza vuelve, la IA la lee: verifica que diga exactamente el copy
  aprobado, y que respete la marca. Avisa. No bloquea: decide una persona.»
- **Movimiento:** el hallazgo «difiere» se resalta con los dos textos enfrentados —aprobado arriba,
  en la pieza abajo— y una línea que los conecta. Es el plano que justifica todo el reel.

### 11 · Cierre — frames 1650–1800

- **Visual:** vuelve el fondo `#1D1D1F`. Las once pantallas pasan en mosaico a velocidad alta
  durante 20 frames y se funden al logo.
- **Texto:** «My Voice» / «Del brief a la pieza verificada.» / «myvoice.lobueno.co»
- **Locución:** «My Voice. Del brief a la pieza verificada.»

---

## Cómo se arma en Remotion

```
video/
  src/
    Root.tsx            ← registra la composición: 1080×1920, 30 fps, 1800 frames
    Reel.tsx            ← <Series> con las once escenas y sus duraciones
    escenas/
      Gancho.tsx        Problema.tsx      Pantalla.tsx     Cierre.tsx
    componentes/
      TextoEnPantalla.tsx   ← entrada con spring, una línea por vez
      Captura.tsx           ← <Img> con parallax y scale; recibe `foco` para el zoom
      Resalte.tsx           ← el recuadro redondeado que señala una zona
  public/pantallas/     ← copiar acá design/exports/*.png
```

**Tres decisiones que conviene tomar antes de escribir código:**

1. **Las capturas son horizontales y el reel es vertical.** No se achican para que entren: se
   muestran **recortadas y con zoom sobre la zona que importa**, que además es lo que hace legible
   un texto de 10 px en un teléfono. `Captura.tsx` recibe el punto de foco en coordenadas
   relativas.
2. **Una sola escala tipográfica**, la del producto: 64 px para los títulos, 34 px para los
   subtítulos, Inter. El video se tiene que ver como la herramienta, no como una pieza aparte.
3. **La locución se graba después del corte visual**, no antes: el texto en pantalla ya cuenta la
   historia, y grabar primero obliga a estirar escenas para que entre la voz.

## Qué falta para producirlo

- [ ] Definir si lleva locución humana o queda solo con texto y música.
- [ ] Elegir la música: **corte marcado alrededor del segundo 10**, donde el problema se convierte
      en producto.
- [ ] Grabar una captura real del tablero **en movimiento** para la escena 8: una tarjeta cambiando
      de columna de verdad se ve mejor que la misma animada sobre una imagen fija.
