# Oráculo de diseño — primera pasada

> Auditoría de consistencia de la interfaz, sobre el árbol de trabajo y sobre las 22 pantallas
> dibujadas en `design/MyVoice_Engine.pen`.
> Fecha: 2026-08-27 · Referencia: [ROADMAP](./ROADMAP.md) · [A2](./plan-a2-whitelabel.md)

## Qué es esto y qué no

Es un instrumento, no una opinión. Cada hallazgo trae el comando que lo reproduce, así que se
puede volver a correr sobre otro estado del código y comparar. Lo que **no** hace: juzgar si una
pantalla es linda. Busca **inconsistencias verificables** — dos nombres para la misma cosa, tres
tokens para el mismo color, dos idiomas en el mismo menú.

La regla que ordena todo lo de abajo: una inconsistencia no molesta porque sea fea, molesta
porque **obliga al usuario a aprender dos veces lo mismo**. Y a un equipo, a decidir dos veces.

## VEREDICTO

**El producto está bien construido y mal nombrado.** La arquitectura de información es correcta
—el orden del menú cuenta la secuencia real del trabajo— pero la capa de nombres, colores e
iconos se decidió pantalla por pantalla y nunca se consolidó. Nada de esto rompe una
funcionalidad; todo esto hace que nueve pantallas se sientan como nueve productos.

Ninguno de los seis hallazgos bloquea el despliegue del H1. Los dos primeros conviene resolverlos
**antes** de que entre A2, porque A2 toca exactamente las mismas pantallas y sería el segundo
pase por el mismo lugar.

---

## Hallazgos, por severidad

### F1 · ALTO — La navegación habla dos idiomas

Seis de los nueve ítems del menú están en inglés: `Brand Voice`, `Generate`,
`Content Selection`, `Analytics`, `Collaboration`, `Team`, `Settings`. Dos en español:
`Historial`, `Guía de uso`.

```bash
sed -n '518,527p' App.tsx | grep -oP "label: '[^']*'"
```

**Por qué importa:** todo lo demás del producto está en español —el copy que genera el motor, los
mensajes de error, las validaciones, los comentarios del código (`CLAUDE.md` lo declara como
regla)— y el usuario final escribe con voseo para mercados LATAM. La navegación es lo primero que
se lee y es lo único que está en otro idioma.

**Arreglo mínimo:** traducir los nueve `label` de `App.tsx:518-527`. Es un diff de nueve líneas.

---

### F2 · ALTO — Cinco de nueve pantallas tienen dos nombres

| Menú | Título dentro de la pantalla |
|---|---|
| Brand Voice | **Clientes** |
| Content Selection | **Biblioteca de Activos** |
| Analytics | Analytics de Copy |
| Collaboration | Collaboration Hub |
| Team | **Miembros del workspace** |
| Settings | **Configuración de IA** |

```bash
grep -oP '(?<=>)[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]{5,35}(?=</h1>|</h2>)' components/*.tsx
```

**Por qué importa:** el peor caso es `Brand Voice` → `Clientes`, porque los dos nombres apuntan a
conceptos distintos. "Brand Voice" nombra **una parte** de lo que se edita ahí (la voz), y
"Clientes" nombra **otra cosa** (la empresa). Lo que la pantalla realmente administra son marcas
con su ADN: voz, propuesta de valor, prohibiciones, ejemplos aprobados y PDF de guía. Alguien que
busca dónde cargar una marca no tiene forma de deducir que es "Brand Voice".

**Escenario de falla:** un miembro nuevo del equipo entra, quiere cargar una marca, recorre el
menú y no la encuentra. El atajo que sí funciona —`onNavigateToClients` desde el formulario de
generación (`App.tsx:726`)— solo aparece cuando ya empezaste a generar.

**Arreglo mínimo:** un nombre por pantalla, definido una sola vez y usado en los dos lugares. Si
el título y el ítem del menú salen de la misma constante, el problema no puede volver.

---

### F3 · MEDIO — Tres negros distintos para el mismo botón primario

```bash
grep -ohP 'apple-btn-primary|bg-gray-900|bg-\[#1D1D1F\]|bg-black' components/*.tsx App.tsx | sort | uniq -c
#   3 apple-btn-primary
#  12 bg-[#1D1D1F]
#  13 bg-black
#  41 bg-gray-900
```

Son tres colores diferentes: `#111827` (gray-900), `#000000` (black) y `#1D1D1F` (el gris de la
paleta Apple que usan Login y HomePage). Más una clase propia, `apple-btn-primary`, que define un
cuarto camino.

**Por qué importa:** conviven en la misma pantalla. En Resultados, el botón de exportar y el de
guardar no son del mismo negro, y nadie lo eligió: se fue acumulando. Cuando A2 agregue el color
de marca, va a haber que decidir cuál de los tres reemplaza — y hoy no hay una respuesta.

**Arreglo mínimo:** un token, `--color-ink`, y los 66 usos apuntando ahí. Es mecánico y es el
prerrequisito de A2: no se puede tematizar lo que no está tokenizado.

---

### F4 · MEDIO — Nueve iconos dibujados a mano, y nueve emoji que nadie renderiza — CORREGIDO

> **Corrección del 2026-08-27.** La primera versión de este hallazgo decía que la navegación
> mostraba emoji. Es falso: grepeé la *declaración* y no el *render*. `navItems` declaraba
> `icon: '👥'…` pero el menú nunca leía ese campo — dibujaba nueve SVG inline desde `navIcons`.
> El arreglo propuesto no cambia; el motivo sí. Queda anotado como recordatorio de la regla de
> este documento: un grep sobre la declaración no prueba lo que la pantalla muestra.

```bash
grep -c "navIcons\[" App.tsx                            # 1 — el menú renderiza esto
grep -n "tab.icon\|item.icon" App.tsx                    # vacío — el emoji era dato muerto
grep -l "from 'lucide-react'" components/*.tsx | wc -l   # 10
```

**Por qué importaba:** nueve SVG escritos a mano en el componente más grande del repo, que
duplican iconos que `lucide-react` ya provee y que diez componentes ya usan. Más nueve campos
`icon` con emoji que nadie leía, que es peor que un icono feo: es una mentira en la estructura de
datos, y fue exactamente lo que me hizo escribir mal el hallazgo.

**Arreglo:** aplicado. Los iconos viven en `SCREENS[id].icon` (`screens.ts`), junto al nombre.

### F5 · MEDIO — El título de cada pantalla tiene un tamaño distinto

`22px` en Team, `16px` en Clientes, `15px` en Analytics, Historial y Collaboration, `14px` en
ClientPortal, `12px` en la biblioteca. Siete pantallas, cinco escalas.

**Por qué importa:** el tamaño del título es la señal de "dónde estoy" y de qué es lo más
importante de la pantalla. Cuando cambia entre pestañas, el usuario percibe que cambió de
aplicación, no de sección. La biblioteca es el caso extremo: su título es más chico que el texto
de sus propias filas.

**Arreglo mínimo:** una escala de tres tamaños —título de pantalla, título de sección, cuerpo— y
las siete pantallas usándola.

---

### F6 · BAJO — Cambiar de empresa es un `<select>` nativo

`App.tsx:632`: el cambio de workspace, que es la acción de más consecuencias de la aplicación
(cambia por completo qué datos se ven), es un desplegable nativo del navegador de 10px, sin
identidad, escondido bajo el nombre del producto.

**Por qué importa:** no hay confirmación ni señal de contexto. Un admin de agencia con cuatro
empresas puede generar copy contra la marca equivocada sin notarlo hasta ver el resultado.

**Arreglo mínimo:** está dibujado en `§ A2 · Selector de workspace`. Entra con A2, no antes.

---

## Estado de las recomendaciones

R1, R2 y R3 se aplicaron el mismo día que se escribió este documento. Lo que sigue queda como el
registro de por qué se hicieron, no como trabajo pendiente:

| | Recomendación | Estado |
|---|---|---|
| R1 | Diccionario de nombres | **Hecho** — `screens.ts` |
| R2 | Token de color y escala tipográfica | **Hecho** — `ink` / `ink-hover` en `tailwind.config.js` |
| R3 | Iconografía única | **Hecho** — `lucide-react` en `SCREENS[id].icon` |
| R4 | Navegación por etapas | **Hecho** — `NAV_STAGES`, adelantado a A2 |

## Recomendaciones, en orden

**R1 · Un diccionario de nombres — medio día.** Una constante por pantalla que alimente el ítem
del menú y el título. Resuelve F1 y F2 juntos y hace que no puedan reaparecer. Es lo primero
porque es lo más barato y lo que más se nota.

**R2 · Tokens de color y una escala tipográfica — 1 día.** Resuelve F3 y F5, y es
**prerrequisito de A2**: el color de marca necesita un token al que reemplazar. Hacerlo después
de A2 significa tocar las mismas pantallas dos veces.

**R3 · Iconografía única — 2 horas.** Resuelve F4. Los iconos ya están elegidos en el canvas.

**R4 · Navegación por etapas — con A2.** Agrupar los nueve ítems en Preparar / Producir /
Aprobar y medir / Administrar. Es la única recomendación que cambia la interacción y no solo la
superficie: convierte una lista plana en el proceso que el producto ya ejecuta. Está dibujada en
`§ Navegación unificada`.

## Lo que este oráculo no revisó

Declarado para que no se lea como cobertura completa:

- **Accesibilidad.** Contraste real medido, foco de teclado, roles ARIA, tamaño de áreas
  clicables. Nada de eso se auditó, y `text-[10px]` aparece 83 veces en el código.
- **Estados vacíos, de carga y de error** de cada pantalla. Se dibujó el estado principal de cada
  una; los demás no se compararon entre sí.
- **Comportamiento responsive.** Las 22 pantallas del canvas están a 1200 px.
- **El copy de la interfaz** más allá de los títulos: mensajes de error, textos de ayuda,
  confirmaciones.

## Cómo volver a correrlo

Los seis hallazgos se reproducen con los comandos de cada sección. El valor de esto no es el
documento sino poder repetirlo: correr los mismos greps dentro de dos lotes y comparar los
conteos dice si la consistencia mejoró o si se agregaron dos negros más. Un hallazgo sin comando
que lo reproduzca no debería entrar acá.
