# Marcas relacionadas: madre, complementarias y nombres repetidos

> **2026-10-28:** «la relación solo ordena» queda reemplazado por la decisión 16 de
> [ecosistema/decisiones.md](./ecosistema/decisiones.md): la submarca **hereda** de su madre por capas
> (prohibiciones siempre, lo demás se suma o se define propio) y cada campaña fija su versión del ADN.

Origen: el hotfix del 2026-10-13 (PR #33). Un usuario creó una campaña en Comfama y quedó en
Terpel. La causa fue un bug del frontend, pero lo que dejó a la vista es otra cosa: en Buentipo
hay **dos marcas que se llaman «Terpel»**, una «Terpel CRM» y una «Viveterpel», y el selector las
lista planas. Quien elige no tiene cómo distinguir las dos «Terpel» ni saber que «Terpel CRM» es
parte de Terpel. Las dos «Terpel» ya estaban anotadas en la
[bitácora del 2026-09-24](./bitacora-2026-09-24.md) y nadie las resolvió, porque la herramienta no
lo pedía.

Decisión del usuario (2026-10-13): **la relación la declara quien administra y la herramienta
avisa sola cuando dos marcas se llaman igual.** Se construye en dos entregas: primero la relación,
el aviso y renombrar; después «Unir».

El nivel 1 está dibujado en `design/MyVoice_Engine.pen`, en la sección «— Marcas relacionadas»,
debajo de H3.D. Son tres bloques: «§ Marcas · Selector agrupado», «§ Marcas · Agrupadas y nombre
repetido» y «§ Marcas · Declarar y unir».

## Nivel 1 · Qué ve el usuario

**Una marca puede ser parte de otra.** Al editar una marca, quien administra completa el campo
«Es parte de». Así «Terpel CRM» y «Viveterpel» quedan como complementarias de Terpel. Hay un solo
nivel: una marca que ya tiene complementarias no puede ser parte de otra, y el campo lo explica
en una línea.

**La relación solo ordena.** Una complementaria no hereda nada de su madre: ni el ADN, ni las
campañas, ni el responsable de aprobación, ni la cuota. Cada marca sigue con lo suyo. La
relación sirve para que se vean juntas y para que nadie confunda una con otra.

**El selector del encabezado agrupa.** Cada complementaria aparece sangrada debajo de su madre.
Con el menú cerrado se lee «Terpel CRM · de Terpel». En «Lo mío», que cruza marcas, cada
tarjeta dice lo mismo.

**Dos marcas con el mismo nombre se notan.** Las dos llevan el aviso «nombre repetido» y una
línea con lo que las distingue: cuántas campañas tienen, si tienen complementarias y desde
cuándo existen. Si en el workspace hay algún nombre repetido, Marcas lo avisa arriba y el pie
del selector lleva hasta ahí. La tarjeta de la marca con menos contenido ofrece tres salidas:

| Salida | Qué pasa | Entrega |
|---|---|---|
| Es otra: renombrar | Se edita el nombre. El aviso desaparece cuando los nombres dejan de ser iguales | 1 |
| Es parte de Terpel | Pasa a ser su complementaria. **El aviso sigue** hasta que se renombre: un «Terpel» dentro de «Terpel» sigue siendo ambiguo | 1 |
| Es la misma: unir | Todo lo de una pasa a la otra y la que sobra se borra | 2 |

**El aviso no se descarta.** Se va solo cuando los nombres dejan de ser iguales o cuando las dos
marcas pasan a ser una. Dos marcas distintas con el mismo nombre siguen siendo una trampa en el
selector, aunque alguien haya dicho «ya sé».

**Estados límite:**
- *Qué cuenta como repetido:* el mismo nombre sin distinguir mayúsculas, tildes ni espacios
  («Terpel» = «terpel » = «TÉRPEL»). «Terpel CRM» no es repetido: es otro nombre. Solo se compara
  dentro del workspace.
- *Crear una marca con un nombre que ya existe:* no se bloquea, pero antes de guardar avisa «Ya
  hay una Terpel en Buentipo. ¿Querías crear una complementaria?» y ofrece el atajo a «Es parte
  de».
- *Borrar una madre:* sus complementarias quedan como marcas sueltas, no se borran con ella. El
  diálogo lo avisa.
- *Quien no administra:* ve los avisos y las familias, pero no los botones. En su lugar lee
  «Pedile a quien administra que lo resuelva».

## Nivel 2 · Entrega 1 — la relación, el aviso y renombrar

**Datos** (`20261014000000_marcas_relacionadas`, aditiva):

- `Client.marcaMadreId String?`, autorrelación `MarcaMadre` con `onDelete: SetNull`, para que
  borrar una madre suelte a sus complementarias en vez de arrastrarlas. Lleva `@@index([marcaMadreId])`.
- La migración no rellena nada: en producción nadie declaró relaciones todavía.

**Reglas** (en `clientController.ts`, dentro de una transacción):

- `marcaMadreId` entra a la lista blanca `CLIENT_UPDATABLE`, y `POST /clients` también lo acepta.
  Antes de escribir, se valida:
  - la madre está en el workspace (`assertClientInWorkspace`; si es ajena, **404**, no 403);
  - la madre no es la misma marca;
  - la madre no es complementaria de otra;
  - la marca no tiene complementarias propias.

  Cualquier falla devuelve un 400 con la razón en una línea, que es la que muestra el campo.
  `null` suelta la relación.
- `GET /clients` agrega dos campos que se calculan al leer y no se guardan, igual que la `etapa`
  del copy: `nombreRepetidoCon` (los ids del workspace con el mismo nombre normalizado) y
  `conteos` (`campanas`, `complementarias`). El aviso no tiene estado propio. Por eso no puede
  quedar desfasado del nombre ni hay nada que descartar.
- La normalización vive en `shared/nombreDeMarca.ts`: minúsculas, sin tildes (NFD sin marcas
  diacríticas) y con los espacios colapsados. Ese archivo no importa nada, como
  `lobuenoBrand.ts`, porque lo leen los dos tsconfigs. El frontend la usa para avisar antes de
  crear una marca y el servidor para calcular el campo; los dos usan la misma función, así que
  no pueden discrepar.

**Pantallas:**

- `App.tsx`: el `<select>` nativo del encabezado no puede mostrar sangría, aviso y distinción en
  la misma opción. Pasa a ser un componente propio, `components/SelectorDeMarca.tsx`: un botón
  que abre una lista navegable con teclado (flechas, Enter, Escape) con `role="listbox"`. Se
  persiste en `vt_marca_activa` igual que hoy.
- `ClientManager.tsx`: las tarjetas se agrupan por familia y aparece el aviso arriba. La tarjeta
  repetida trae «Renombrar» y «Es parte de…»; el campo «Es parte de» va en el formulario de
  edición, y el aviso aparece también al crear una marca.
- `TableroProduccion.tsx` («Lo mío»): la marca de cada tarjeta se lee «X · de Y».

**Criterios de aceptación:**
- Pasan las tres compuertas de tipos.
- `verify:isolation` incluye estos casos nuevos:
  - asignar como madre una marca de otro workspace devuelve 404;
  - `nombreRepetidoCon` nunca devuelve ids de otro workspace;
  - un MEMBER no puede escribir `marcaMadreId`.
- Recorrido a mano con los datos reales de Buentipo:
  - declarar Terpel CRM y Viveterpel como complementarias;
  - ver el aviso en las dos «Terpel»;
  - renombrar la vacía y ver que el aviso desaparece de las dos.

**Después del despliegue:** ~~con los datos de hoy, la segunda «Terpel» no tiene campañas~~.
**Corrección del 2026-10-13:** el ensayo de la entrega 2 contra una copia de producción mostró que
la segunda «Terpel» (alta 2026-05-12) tiene 25 generaciones, 3 briefs, 11 copys y 3 campañas, más
que la primera en varios rubros. El supuesto venía de los datos ilustrativos del `.pen`. Borrarla no
es una opción —las generaciones y el copy lo impiden, y se perdería trabajo—: o se renombra, si es
otra marca, o se une con la primera.

**Lo que cambió al construirla** (2026-10-14):
- El normalizador no vive en `shared/`: la API compila solo `src/` y su imagen de Docker se arma
  desde `server/`, así que importarlo rompería el deploy. Está en `server/src/lib/nombreDeMarca.ts`,
  y el frontend tiene una copia en `marcas.ts` solo para el aviso previo al crear. La verdad
  (`nombreRepetidoCon`) la calcula el servidor.
- Las validaciones de la madre corren antes de escribir, no dentro de una transacción. Dos personas
  que en el mismo segundo hacen a A madre de B y a B madre de A podrían romper el límite de un nivel;
  con las dos o tres personas que administran un workspace, el riesgo no justifica el bloqueo.
- Marcas mantiene la grilla de tarjetas, ordenada por familia (cada madre seguida de sus
  complementarias, marcadas «Complementaria de…»), en vez de las filas por familia del `.pen`.
- Después de cambiar el nombre o la madre, la app vuelve a pedir la lista: los campos calculados
  dependen de todas las marcas.

## Nivel 2 · Entrega 2 — Unir

**Construida el 2026-10-13** (`services/unirMarcas.ts`, `POST /clients/:id/unir`, el diálogo en
Marcas). Mueve once tablas, suma el consumo del mismo mes, descarta funciones repetidas, reacomoda la
familia y, antes de borrar el origen, cuenta que no le quede ninguna fila apuntando: cuatro tablas
borran en cascada con la marca, y olvidarse de una sería perder datos sin aviso. Sin aislamiento
`Serializable`: en una transacción larga, cualquier generación concurrente la abortaría.

**Ensayo contra la copia de producción del 2026-10-13** (restaurada en local y borrada al
terminar): unir la segunda «Terpel» con la primera movió 25 generaciones, 3 briefs, 11 copys,
3 campañas y 1 feedback negativo en 35 ms. Los totales de la marca que queda son la suma exacta, y
los de toda la base son idénticos antes y después salvo una marca menos.


`POST /clients/:id/unir` con `{ destinoId }`, solo para OWNER y ADMIN. Antes de tocar nada pasa
por `assertClientInWorkspace` para las dos marcas. Todo ocurre en **una sola transacción**: si
algo falla, no se mueve nada.

Mueve a `destinoId` el `clientId` de estas tablas:
- `GenerationLog`
- `ContentDNAProfile`
- `SavedVariation`
- `Project`
- `NegativeFeedback`
- `GenerationPreset`
- `Pieza`
- `Notificacion`
- `User.clientId` (legado, pero se mueve igual para que el backfill no encuentre huérfanos)

Hay dos tablas con restricciones de unicidad que no se pueden mover sin más:
- **`UsagePeriod @@unique([clientId, periodStart])`**: si las dos marcas tienen el mismo periodo,
  se suman y se borra la fila de origen. Si solo existe la de origen, se mueve.
- **`MiembroFuncion @@unique([workspaceId, userId, funcion, clientId])`**: se borra la de origen
  cuando ya existe la misma función en el destino.

Las complementarias de la marca de origen pasan al destino. Si el destino es complementaria de
otra marca y el origen tenía complementarias, la operación se rechaza: se rompería el límite de
un nivel.

El ADN de marca que vale es el del destino. Si el de origen era distinto, el diálogo muestra las
dos versiones antes de confirmar. No se mezclan automáticamente.

Las sesiones de revisión no tienen `clientId` propio: la marca les llega por sus items. Al moverse
todos los items a la misma marca, una sesión no puede quedar mezclada. Aun así,
`verify:isolation` lo comprueba.

`App.tsx`: si `vt_marca_activa` apunta a una marca que ya no existe, se elige la primera marca
del workspace en vez de dejar el selector vacío. Hay que comprobar si hoy ya lo hace antes de
tocarlo.

**Criterios de aceptación:**
- `verify:isolation` incluye estos casos:
  - unir con una marca de otro workspace devuelve 404 y no mueve nada;
  - unir dos marcas con un `UsagePeriod` del mismo mes suma el consumo;
  - una sesión de revisión de la marca de origen queda homogénea después de unir.
- Un ensayo contra una copia de la base de producción, uniendo dos marcas con contenido real,
  con un conteo de filas por tabla antes y después.
