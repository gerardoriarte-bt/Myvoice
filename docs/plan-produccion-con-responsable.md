# Producción con responsable: quién hace qué, cómo se aprueba, se valida y se corrige

Origen: la revisión de experiencia de Producción del 2026-10-13, hecha en pantalla con dos roles
(OWNER responsable y MEMBER diseñadora) y contra el código. El diagnóstico en una línea: **el copy
tiene un dueño en cada paso desde el #32; la pieza no tiene dueño en ninguno.** Todas las rutas de
`/piezas/*` usan `inWorkspace` y el servicio no mira ni el rol ni la función: una diseñadora aceptó
su propia pieza por la API y quedó «Lista».

Lo demás que encontró la revisión:

- **Dos «aprobación del cliente» que no se hablan.** El copy sigue el modo de la campaña; la pieza,
  un interruptor (`pideAprobacionDeCliente`) en la columna Lista que cualquiera cambia.
- **«Lista» significa cuatro cosas**: cerrada, esperando al cliente, aprobada por él y devuelta con
  cambios de copy. «Mandar al cliente» reenvía todo, incluido lo ya aprobado.
- **Una devolución no se ve**: la tarjeta no la dice y nadie recibe aviso.
- **Una corrección de copy no tiene salida.** El copy «En producción» no se edita en Copy;
  «Actualizar la orden» falla en Lista, que es donde queda la pieza cuando el cliente pide cambios
  solo de copy.
- **El cliente puede rechazar sin escribir nada**, y no queda ningún registro.
- **La auditoría termina después** de que la pieza llegó a revisión, y su informe ofrece botones de
  dos personas sin decir de quién es cada uno.
- Revisiones se caía al abrir una revisión de piezas respondida (arreglado en este mismo PR).

Decisiones del usuario (2026-10-13):

1. **Acepta o devuelve el responsable de la campaña**, el mismo que aprueba el copy. Nunca quien la
   entregó.
2. **El cliente aprueba piezas si la campaña es «del cliente»**. Se va el interruptor.
3. **La pieza llega a revisión con la auditoría terminada.** Sigue sin bloquear.

El nivel 1 está dibujado en `design/MyVoice_Engine.pen`, sección «— Producción con dueño»: el
tablero, la misma pieza vista por tres personas, «Lo mío» y el camino de una corrección.

## Nivel 1 · Qué ve el usuario

**Cinco columnas, cada una con un dueño con nombre.**

| Columna | Qué es | Dueño | La mueve |
|---|---|---|---|
| Por asignar | Copy aprobado esperando quién lo diseñe | Quien administra | Asignar |
| En diseño | La diseñadora la produce; al subir, la auditoría corre acá | La diseñadora asignada | Subir o entregar |
| Por revisar | Entregada y auditada | El responsable de la campaña | Aceptar o devolver |
| Con el cliente | Aceptada; la campaña es «del cliente» | El responsable: se la manda y responde por ella | El cliente aprueba o devuelve |
| Lista | Aprobada por quien correspondía. Terminada | Nadie: es el final | Reabrir, si hace falta |

**Quien no puede actuar no ve el botón: lee quién lo hace.** «La acepta Laura Gómez, responsable de
«Lanzamiento My Voice».» A quien entregó la pieza: «La entregaste. Espera el visto bueno de Laura
Gómez.» Quien administra no se salta al responsable: si hace falta, lo cambia en la campaña.

**La tarjeta dice lo que pasó**: «Devuelta por Laura · hace 2 h» con cada motivo rotulado (Arte o
Mensaje); «Auditando la versión 2…»; «Sin enviar» o «Enviada el 13 oct · esperando» al cliente;
«Aprobada por el cliente · Natalia O.» o «Aceptada por Laura · interna» en Lista.

**«Lo mío» reemplaza a «Mis piezas»** y suma lo que te toca decidir, no solo lo que diseñás. Para
quien aprueba: «Esperan tu visto bueno», «Para mandar al cliente», «Esperando al cliente». Para
quien diseña: «Devueltas», «En diseño», «Entregadas». Cruza marcas, como antes.

**Validar.** Al subir, la pieza queda en En diseño con «Auditando…» y recién al terminar pasa a Por
revisar y le avisa al responsable. Si la IA falla, pasa igual con «Revisar a ojo». Cada hallazgo lo
decide el responsable —«Lo corrige diseño» o «Va igual», con una línea— y aceptar una pieza con un
hallazgo sin decidir pide una línea de por qué.

**Corregir.** Toda devolución —del equipo o del cliente— lleva motivo escrito y rotulado, vuelve a
En diseño y le avisa a la diseñadora. **Cambia una regla de H2.E:** un rechazo solo de copy ya no
deja la pieza quieta en Lista, donde quedaba varada. Vuelve a diseño marcada «Espera el copy», y el
responsable corrige el copy **dentro de la pieza**, en la orden de trabajo. La corrección queda en
el historial y en Copy.

**Avisos**: asignada → a la diseñadora (ya existía); entregada y auditada → al responsable;
devuelta → a la diseñadora; el cliente respondió → al responsable.

## Nivel 2 · Cómo se construye

**Datos** (aditivas, dos migraciones porque Postgres no deja usar un valor de enum nuevo en la
misma transacción que lo crea):

- `20261013000002_pieza_con_el_cliente`: `ALTER TYPE "PiezaEstado" ADD VALUE 'CON_EL_CLIENTE'
  BEFORE 'LISTA'`, para que el orden por estado del tablero siga siendo el del proceso.
- `20261013000003_pieza_con_el_cliente_datos`: las piezas en `LISTA` que están en una revisión de
  piezas pendiente y vigente pasan a `CON_EL_CLIENTE`. Las que ya estaban en Lista sin enviar
  quedan en Lista: el equipo ya las había dado por terminadas.
- `Project.pideAprobacionDeCliente` deja de leerse y de escribirse; la columna queda un ciclo de
  despliegue, como las otras legadas.

**Permisos** (`server/src/services/permisosPieza.ts`, el único lugar que los decide). Devuelve,
por pieza y por persona, qué puede hacer y, si no, quién lo hace. El tablero lo recibe como
`puedo` y `quienDecide`, así la pantalla y el servidor no pueden discrepar:

| Acción | Quién |
|---|---|
| Crear piezas (`POST /piezas`, propuesta) | Quien administra (ya era así en la pantalla) |
| Asignar, reasignar, renombrar, actualizar la orden | Quien administra o el responsable |
| Subir o entregar | La asignada o quien administra |
| Aceptar, devolver, decidir hallazgos | El responsable, **y no quien subió la versión actual** |
| Reabrir, corregir el copy | El responsable |
| Mandar al cliente | El responsable o quien administra |
| Comentar, reauditar | Cualquiera del workspace |

Sin permiso es **403 con el motivo** en una línea («La acepta Laura Gómez, responsable de …»);
otro workspace sigue siendo 404.

**Máquina de estados** (`TRANSICIONES` en `piezaService.ts`):

- `aceptar`: Por revisar → **Lista** si la campaña es interna, **Con el cliente** si es del cliente.
  Con hallazgos sin decidir exige nota.
- `devolver`: desde Por revisar **o Con el cliente** → En diseño, con motivo.
- La respuesta del cliente: aprobada → Lista (evento `APROBADA_CLIENTE`); rechazada → En diseño
  con un evento `DEVUELTA` por categoría, sea de arte o de copy. Un rechazo sin texto es 400.
- `corregir-copy` (nueva): el responsable reescribe uno o más slots. Actualiza el texto congelado
  de la pieza **y** el `SavedVariation`, que queda aprobado por el responsable. No mueve la pieza.
  Evento `COPY_CORREGIDO`; la tarjeta deja de decir «Espera el copy».

**Auditoría antes de revisión.** `entregarArchivo` crea la versión y deja la pieza en En diseño
con un evento `SUBIDA`. `auditarEnSegundoPlano` recibe un callback que, al terminar en COMPLETA o
NO_DISPONIBLE, mueve la pieza a Por revisar (evento `ENTREGADA`) y avisa, solo si la versión
auditada sigue siendo la última y la pieza sigue en En diseño. Al arrancar, el servidor rescata las
versiones `PENDIENTE` de hace más de 10 minutos —una auditoría cortada por un reinicio— como
NO_DISPONIBLE y las pasa a revisión. La entrega por enlace (video, audio) no se audita y pasa
directo, como hoy.

**Avisos** (`notificacionService.ts`, `destinatariosDe` sigue siendo el único lugar): ENTREGA va al
responsable de la campaña (sin responsable, a quien tenga la función Aprobación o a quien
administra, como hoy); DEVOLUCION, nueva, a la asignada; RESPUESTA_CLIENTE, nueva, al responsable.

**Pantallas** (`components/produccion/`): la columna Con el cliente con «Mandar N sin enviar»; las
señales de la tarjeta; botones según `puedo`; «Lo mío»; en la orden de trabajo, «Corregir el copy»
y el historial con nombres legibles y el nombre del cliente; el informe con «Lo corrige diseño» /
«Va igual» y el contador de pendientes. Sale el interruptor de la columna Lista. En el portal, «Pedir
cambios» exige escribir qué.

**Criterios de aceptación:**
- Las tres compuertas de tipos.
- `verify:isolation` con una diseñadora aparte en el tenant B: quien entrega no acepta; un MEMBER
  no responsable no acepta ni devuelve; la pieza sube, se audita (NO_DISPONIBLE en CI) y recién ahí
  pasa a Por revisar.
- Recorrido en local con Laura y Sofía: asignar → subir → auditando → por revisar → devolver con
  mensaje → corregir el copy → subir v2 → aceptar → con el cliente → mandar → el cliente devuelve
  con arte → v3 → el cliente aprueba → Lista.

**Fuera de alcance:** comparar v1 y v2 en el informe; asignar juntas las piezas hermanas; la fase 3
de H2.E (el feedback de copy como propuesta para el motor).
