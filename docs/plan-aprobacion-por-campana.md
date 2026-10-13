# Aprobación por campaña y recorrido lineal por marca

Origen: la auditoría de experiencia del 2026-10-13. Tres causas de fondo:

1. **La marca no era un contexto.** Cada pantalla tenía su propio selector (Generar, Copy aprobado,
   Revisiones, Producción) y cambiar en una no se arrastraba a la siguiente.
2. **El copy no tenía un estado de punta a punta.** `isApproved` mezclaba la aprobación interna y
   la del cliente; no existían «con el cliente» ni «devuelto». Un rechazo del cliente no deshacía
   una aprobación interna previa, y ese copy podía ir a producción igual.
3. **«Campaña» quería decir dos cosas.** En Marcas y en Generar era el brief (`ContentDNAProfile`);
   al guardar y en Producción era el `Project`. Se elegían por separado y nada las unía.

Decisión del usuario (2026-10-13): **la aprobación antes de producir es obligatoria y se define por
campaña** —interna o del cliente— **y siempre tiene un responsable con nombre.**

No hubo diseño previo en el `.pen`: el MCP de Pencil no conectó en la sesión. El nivel 1 queda
escrito acá para validarlo sobre la pantalla funcionando.

## Nivel 1 · Qué ve el usuario

**La marca, arriba y una sola.** El encabezado lleva el selector de marca; todas las pantallas
trabajan sobre ella y la recuerdan entre sesiones. La única vista que cruza marcas es «Mis piezas»,
que dice la marca en cada tarjeta.

**Una campaña es una sola cosa.** La campaña que se elige en Generar (el brief) es la misma donde
cae el copy al guardar: ya no se pregunta «¿en qué proyecto?». Cada campaña dice cómo se aprueba:

- **Interna** — aprueba una persona del equipo, el responsable.
- **Del cliente** — aprueba el cliente desde el enlace de revisión; el responsable es quien se la
  manda y responde por ella.

Sin responsable, la campaña puede generar y guardar, pero su copy no avanza: Generar lo avisa
antes de gastar, y quien administra lo define ahí mismo.

**El copy tiene un recorrido, no un estado suelto.** La pantalla «Copy» muestra el carril de la
marca y campaña elegidas:

```
Sin campaña · Por aprobar → Con el cliente → Aprobado → En producción     (Devuelto)
```

Cada paso cuenta cuántos hay y filtra con un clic. La barra de acciones aparece **dentro** del
contenido y ofrece solo lo que hace avanzar lo seleccionado:

| Seleccionado | Acción |
|---|---|
| Por aprobar / Devuelto, campaña interna, sos el responsable | Aprobar |
| Por aprobar / Devuelto, campaña del cliente | Enviar al cliente → muestra el enlace |
| Aprobado | Mandar a producción |
| Sin campaña | Asignar a una campaña |

Lo que no se puede, se explica en una línea. Eliminar pasa a la fila. Toda acción termina en un
aviso y, cuando corresponde, en el enlace o el botón para ir a ver el resultado.

**Revisiones** deja de crear sesiones (había dos caminos con resultados distintos): lista las de la
marca y sigue sus respuestas. **Producción** toma la marca del encabezado.

**Inicio:** quien administra entra a Copy (Marcas si todavía no hay ninguna); quien no, a Producción.

## Nivel 2 · Cómo se construye

**Datos** (`20261013000000_aprobacion_por_campana`, aditiva):

- `enum ModoAprobacion { INTERNA CLIENTE }`.
- `Project`: `clientId?`, `dnaProfileId? @unique`, `modoAprobacion` (default `INTERNA`),
  `responsableId?`. La migración rellena `clientId` en las campañas cuyo copy es de una sola marca.
- `SavedVariation`: `aprobadoPorId?`, `aprobadoPorNombre?`, `aprobadoEn?`, `aprobadoVia?`.

**Reglas** (`server/src/services/aprobacion.ts`, el único lugar que escribe `isApproved` desde la app):

- `isApproved` sale de la lista blanca de `PUT /saved/:id`. Se aprueba con
  `POST /saved/aprobacion`, solo en campañas internas y solo por su responsable.
- Editar el texto de un aprobado, o cambiarlo de campaña, lo devuelve a «por aprobar».
- La ronda de copy solo acepta copy de campañas del cliente, sin aprobar y fuera de otra revisión
  abierta. Al responder, el aprobado queda aprobado *por el cliente* y el rechazado **se desaprueba**.
- La respuesta pública solo toca los items de su propia sesión (antes aceptaba cualquier id).
- Producción exige campaña con responsable además de `isApproved`.
- `GET /saved` calcula la `etapa` de cada copy; no se guarda, para que no pueda mentir.

Legado: el copy aprobado sin campaña aparece en «Sin campaña» y no va a producción hasta asignarle
una y aprobarlo de nuevo. Las campañas existentes quedan `INTERNA` sin responsable: alguien que
administre tiene que nombrarlo antes de que su copy avance.

**Aviso al iniciar sesión** (`novedades.ts`, `components/AvisoDeNovedad.tsx`, migración
`20261013000001_novedades_vistas`): el cambio se explica en un modal la primera vez que cada persona
entra después del deploy, con una versión para quien administra (nombrar responsables) y otra para
el equipo. Lo visto se guarda en `User.novedadesVistas`. La misma entrada queda en la pantalla
Novedades, el registro de cambios, enlazada desde el pie de la barra lateral. **La `fecha` de la
entrada tiene que ser la del deploy**: a quien se dio de alta ese día o después no se le muestra.

**Criterios de aceptación:** las tres compuertas de tipos, `verify:isolation` con los casos nuevos
(aprobar, asignar responsable y responder una revisión con ids ajenos) y el recorrido completo a mano
en el entorno local: generar → guardar → aprobar o enviar al cliente → responder → producir.
