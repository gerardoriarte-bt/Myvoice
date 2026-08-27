# Sistema de diseño

> Lo que el repo versiona del diseño. El archivo fuente —`design/MyVoice_Engine.pen`— vive
> **solo en local y está gitignoreado**: es un binario cifrado que crece con cada versión y que
> git no puede difear ni fusionar. Este documento es la parte que sí tiene que sobrevivir a la
> máquina de quien lo dibujó.
>
> Referencias: [oráculo de diseño](./oraculo-diseno.md) · [plan A2](./plan-a2-whitelabel.md)

## Dónde vive cada cosa

| Qué | Dónde | Versionado |
|---|---|---|
| Nombres de las pantallas | `screens.ts` | Sí — es código |
| Color, tipografía, espaciado | `tailwind.config.js` + `index.css` | Sí — es código |
| Decisiones y sus porqués | este documento | Sí |
| Las pantallas dibujadas | `design/MyVoice_Engine.pen` | **No** |

La regla que ordena la tabla: **si una decisión de diseño se puede escribir como código, va en
código.** El `.pen` es para explorar y validar, no para guardar la verdad. Cuando una decisión se
cierra ahí, baja a `screens.ts`, a `tailwind.config.js` o a este archivo.

## Nombres

Un nombre por pantalla, definido una sola vez en `screens.ts` y usado tanto en el menú como en el
título. No es una convención de estilo: es lo que impide que vuelva el problema que documentó el
oráculo (F2), donde cinco de nueve pantallas se llamaban distinto en el menú y adentro, incluida
una —«Brand Voice» contra «Clientes»— cuyos dos nombres apuntaban a conceptos diferentes.

| Pantalla | Nombre | Antes |
|---|---|---|
| `clients` | **Marcas** | Brand Voice / Clientes |
| `generator` | **Generar** | Generate |
| `saved` | **Biblioteca** | Content Selection / Biblioteca de Activos |
| `history` | **Historial** | Historial / Historial de Generaciones |
| `collaboration` | **Revisiones** | Collaboration / Collaboration Hub |
| `analytics` | **Métricas** | Analytics / Analytics de Copy |
| `users` | **Equipo** | Team / Miembros del workspace |
| `settings` | **Configuración** | Settings / Configuración de IA |
| `help` | **Guía** | Guía de uso |

Todo en español, como el resto del producto: el copy que genera el motor, los mensajes de error,
las validaciones y los comentarios del código. La navegación era lo único que estaba en inglés.

## Navegación: el menú cuenta el proceso

Los nueve ítems se agrupan en cuatro etapas numeradas, definidas en `NAV_STAGES` (`screens.ts`):

```
1 PREPARAR         Marcas
2 PRODUCIR         Generar · Biblioteca · Historial
3 APROBAR Y MEDIR  Revisiones · Métricas
4 ADMINISTRAR      Equipo · Configuración · Guía
```

El orden no se inventó: es casi el que la aplicación ya tenía, con Marcas primero porque cargar
el ADN es el arranque real del flujo. Lo que cambia es que ahora **se lee como una secuencia** en
vez de como una lista de nueve pestañas equivalentes.

Agregar una pantalla es agregar una entrada en `SCREENS` y su id en la etapa que corresponda. Si
no entra en ninguna de las cuatro, probablemente el producto esté creciendo hacia otro lado y
valga la pena discutir la etapa antes que la pantalla.

## Color

**Un solo negro.** El token es `ink` (`#1D1D1F`), con `ink-hover` (`#3A3A3C`) como único estado
hover. Antes convivían tres —`bg-gray-900` (#111827), `bg-black` (#000) y `bg-[#1D1D1F]`— más una
clase propia, `apple-btn-primary`, que definía un cuarto camino. Se usaban en la misma pantalla
sin que nadie lo hubiera decidido.

`ink` cubre las acciones primarias y los velos de modal (`bg-ink/40`). La clase
`apple-btn-primary` de `index.css` conserva el mismo valor escrito a mano, con un comentario que
lo ata al token: si cambia uno, cambia el otro.

**Los colores semánticos no se tematizan.** Verde para aprobar, rojo para rechazar, ámbar para
advertir. Cuando A2 traiga el color de marca por workspace, ese color va a la cabecera y a los
indicadores de progreso — **nunca a los botones de decisión**. Una marca de identidad roja no
puede teñir de rojo el botón de aprobar.

## Tipografía

Tres tamaños para la jerarquía de una pantalla:

| Rol | Tamaño |
|---|---|
| Título de pantalla | `20px` semibold, `tracking-[-0.01em]` |
| Título de sección | `15px` semibold |
| Cuerpo | `13px` |

Antes había cinco escalas distintas entre siete pantallas: 22px en Equipo, 20px en Marcas y
Biblioteca, 15px en Métricas, Historial y Revisiones, 12px en la tabla de la biblioteca — donde
el título de la pantalla era más chico que el texto de sus propias filas.

## Iconos

`lucide-react`, que ya estaba instalado y en uso en diez componentes. El menú dibujaba nueve SVG
a mano en `App.tsx` y además arrastraba nueve emoji declarados que nunca se renderizaban. Los
iconos de cada pantalla viven en `SCREENS[id].icon`, junto al nombre: son parte de cómo se llama
una pantalla, no una decoración aparte.

## Identidad por workspace (A2)

Las reglas que salieron de dibujar los estados límite. Todavía no están implementadas —A2 va
después del despliegue del H1— pero ya están decididas:

1. **La marca del portal de revisión es la del `Client`, no la del `Workspace`.** Quien revisa es
   el cliente de esa marca, no de la empresa que la gestiona.
2. **El contraste se calcula, no se elige.** El tenant elige su color; si es claro, el texto
   encima pasa a oscuro automáticamente. No se bloquea la elección.
3. **El logo nunca se pinta directo sobre el color de marca:** va sobre una plaquita clara. Un
   PNG transparente sobre cabecera oscura desaparece, y es el caso que nadie prueba antes de
   subir el archivo.
4. **Sin logo, iniciales sobre el color del workspace**, reusando el patrón que `ClientManager`
   ya aplica a las marcas sin logo.
5. **El logo se encaja en una caja de alto fijo y ancho libre.** Nunca se estira: una firma
   horizontal y un isotipo cuadrado tienen que convivir sin deformarse.
6. **Un nombre largo se corta al final, no en el medio.** Se conserva el arranque, que es lo que
   identifica.

## El archivo de diseño

`design/MyVoice_Engine.pen`, en local. Contiene 22 secciones rotuladas: las quince pantallas
actuales del producto en su estado principal, las seis propuestas de A2 y la comparación de
navegación de este documento. Cada sección lleva su archivo de origen y una nota de qué mirar.

Si se pierde, se puede reconstruir: las pantallas actuales salen del código y las decisiones
están en este documento. Lo que no se recupera es el tiempo de dibujarlas — por eso conviene que
quien lo tenga haga copia, aunque no vaya al repo.
