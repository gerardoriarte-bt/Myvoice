# Plan · La plataforma como proceso: entornos, CDM, pedidos de copy e implementación

Estado: diseñado en el `.pen` (2026-11-17), por construir · Decisiones 18 a 23 en
[ecosistema/decisiones.md](./ecosistema/decisiones.md) · Pantallas en
[ecosistema/pantallas.md](./ecosistema/pantallas.md) · Spec de la plataforma:
[ecosistema/tecnico/spec-plataforma.md](./ecosistema/tecnico/spec-plataforma.md) · Implementación:
`docs/plan-implementacion.md` (PR #65, todavía no en `main`)

## Por qué

Hoy My Voice es una herramienta: cualquiera del workspace abre cualquier pantalla y el proceso vive en
la cabeza del equipo. Lo diseñado el 2026-11-17 lo vuelve un proceso con dueños:

- **El encabezado es el proceso**: ① Marca · ADN › ② CDM · Planning › ③ My Voice · Copy ›
  ④ Producción · Piezas › ⑤ Implementación. No hay CDM sin marca, ni copy sin sábana aprobada (decisión
  21), y Producción es un paso propio, no una pantalla de My Voice (decisión 23). Va en un subencabezado:
  la fila de arriba queda para identidad, marca, buscar, Mi cola y avisos.
- **Cada persona entra a su entorno y ve el resto en lectura** (decisión 22).
- **CDM arma el planning y la sábana**; al aprobarse, My Voice recibe **pedidos de copy**, uno por línea.
- **El trafficker monta los anuncios** con todo lo aprobado y deja constancia.

## Nivel 1 · Qué ve el usuario (resuelto en el `.pen`)

### Quién hace qué

| Función | Entra a | Actúa en | Lee |
|---|---|---|---|
| **Estrategia** | ① Marca · ADN | ADN, audiencias, confirmar el ADN | sábanas, copy, piezas |
| **Planning** (el *planner* de `docs/v2`: es la misma función) | ② CDM · Plannings | plannings, sábana, biblioteca, medios de la marca, destino y UTM | ADN, copy, piezas |
| **Copy** | ③ My Voice · Pedidos de copy | pedidos de copy; arreglar el copy de una pieza devuelta (en My Voice, decisión 24) | ADN, sábana, biblioteca |
| **Diseño** | ④ Producción · Lo mío | sus piezas: subir versiones | ADN, guía visual, copy aprobado |
| **Aprobación** (responsable o marca) | Mi cola | aprueba sábana, copy y piezas de su campaña | ADN |
| **Trafficker** | ⑤ Implementación · Por montar | anuncios: montar, devolver con novedad | sábana, destino, copy y piezas aprobadas |
| **Admin** (OWNER o ADMIN) | la última pantalla que usó | todo, para destrabar si alguien falta | — |

El cliente no entra: ve lo suyo por enlace, como hoy.

### Pantallas (frames del `.pen`)

| Paso | Pantallas | Qué resuelven |
|---|---|---|
| Marco | Encabezado en dos filas (componente): identidad y avisos arriba, proceso abajo · Quién ve qué · menús por módulo | pasos numerados con ✓, candado que dice qué falta o avance por línea; modo lectura con franja «Tu trabajo está en…» |
| ② CDM | P1 Plannings de la marca · **P7** cómo va cada línea · P2 Nuevo planning · P3 Elegir medios · P4 Sábana · P4b Una línea elige ubicaciones · P5 La marca aprueba · **P6 Destinos y UTM** (entrada del menú: elegir la campaña) · **P6b** destino y UTM de una campaña | el trabajo de Planning, de la marca a la sábana aprobada |
| ② CDM · configuración | B1–B8 Biblioteca (catálogo, Meta por pieza, detalle, guía visual para Diseño, carga desde planilla, los 14 canales) · M1 Medios de la marca | lo que se prepara una vez |
| ③ My Voice | MV0 Cómo se entera Copy · MV Pedidos de copy · **MV2** Aprobar por grupos | llega la sábana: una línea por formato y etapa, con medio, piezas y largo ya decididos |
| ④ Producción | **D1** Lo mío · **D2** Orden de trabajo con la guía visual · **D3** La IA revisa y el responsable decide | Diseño recibe medio, formato, medidas, zona segura y textos aprobados en una pantalla; sube y la IA compara |
| ⑤ Implementación | **T1** Por montar · **T2** Montar un anuncio · **T3** Falta algo · **T4** Devolver con novedad · **T5** Reporte e historial | el trafficker monta de a uno y deja constancia |

### Reglas que el código tiene que cumplir

1. **Ver no se restringe; actuar sí.** Leer cualquier paso de la marca es de todos los miembros del
   workspace. Actuar es de la función del paso (en esa marca, o en todas) o de un admin.
2. **Los candados son del proceso, no de permisos.** CDM espera al ADN (75 % y las ★); My Voice espera a la
   sábana aprobada; Implementación espera copy y pieza aprobados. Un candado dice qué falta y a quién.
3. **Las marcas sin CDM siguen como hoy.** «No hay copy sin CDM» vale solo para las marcas con el módulo
   CDM encendido; las demás generan como siempre (y «Generar suelto» queda para pruebas).
4. **Listo para montar** = copy aprobado + pieza aprobada (por el cliente si la campaña es con cliente) +
   destino + fecha de salida. La UTM avisa y no bloquea.
5. **El historial de aprobaciones no se edita**: un rechazo queda igual que una aprobación.

## Nivel 2 · Cómo se construye

Seis entregas, cada una un PR (o dos) que deja `main` desplegable, con el esquema solo aditivo y lo
nuevo detrás del interruptor del workspace (`plataformaPorProcesos`, abajo) y, para CDM, del interruptor por
marca (`ModuloDeMarca`, spec § 3). El orden sigue la decisión 17: primero
el marco, después la marca hacia adelante.

### Convivencia con lo que está en producción (2026-11-17)

El plan se construye sobre el mismo código que corre en myvoice.lobueno.co, y F0 cambia lo que el equipo
usa todos los días (encabezado, navegación, Producción fuera de My Voice). `ModuloDeMarca` decide qué
módulos tiene una marca, pero no protege el marco: sin otra cosa, desplegar F0 lo cambiaría para todos de
una vez. Gerardo decidió (2026-11-17):

- **Un interruptor por workspace, `Workspace.plataformaPorProcesos`** (booleano, `false` por defecto,
  migración aditiva), como `Workspace.procesoCampana` en la v2. Apagado, la app se ve como hoy: la
  navegación de `App.tsx` y `NAV_STAGES`. Encendido, el marco nuevo: encabezado en dos filas, enrutador,
  menús por paso, Producción como paso ④ y el Panorama. El interruptor elige el **marco**, no duplica
  pantallas: las de hoy se montan dentro de uno u otro sin reescribirse.
- **Lo nuevo de cada entrega (F1 a F5) también queda detrás del interruptor**, y CDM además detrás de
  `ModuloDeMarca` por marca.
- **Migraciones solo aditivas**: columnas y tablas nuevas, nunca cambiar ni borrar las que se usan hoy. Un
  despliegue con el interruptor apagado no cambia nada para el equipo, así que cada entrega se puede
  mergear y desplegar sin esperar a la siguiente.
- **Se prende primero en «LoBueno · Capacitación»** (`seed:capacitacion`) y en el workspace real solo
  cuando Gerardo lo decida. Apagarlo de nuevo vuelve al marco de hoy sin perder datos.
- **Verificación de cada despliegue con el interruptor apagado**: iniciar sesión, generar, Copy, Revisiones
  y el tablero de Producción se ven y funcionan igual que antes.
- Lo que ya estaba en `main` antes de F0 (el #73, sin voseo) se despliega antes y por separado, para no
  mezclarlo con el marco nuevo.

### F0 · El marco: enrutador, encabezado y menús (sin datos nuevos)

- **Enrutador** (spec § 4.1): rutas `/marca/:id`, `/cdm/…`, `/myvoice/…`, `/produccion/…`,
  `/implementacion/…`, `/cola`.
  `?review=`, `?invite=` y `?pieza=` se siguen leyendo y redirigen. Las pantallas de hoy se montan
  dentro del marco sin reescribirlas.
- **Encabezado en dos filas**: `src/plataforma/Barra.tsx` (identidad, marca, buscar, Mi cola, avisos,
  cuenta: no cambia entre pantallas) y `src/plataforma/Proceso.tsx`: abre con el **selector de campaña**
  (las de la marca activa, cada una con el paso en que va; «Todas las campañas» para listas y colas) y
  sigue con los cinco pasos. La campaña activa vive en la ruta (`/campana/:id/…`), no en `localStorage`
  como la marca: dos pestañas pueden estar en campañas distintas, y un aviso abre la suya. El estado de cada paso lo calcula el servidor al leer, **`GET /clients/:id/proceso[?campana=]`**:
  `{ paso, estado: 'hecho' | 'activo' | 'bloqueado', falta?: string, quien?: {id, nombre},
  avance?: {hechas, total} }[]`, en `server/src/plataforma/proceso.ts` (en la parte común hasta el 2026-11-23). Usa `completitudAdn` (①), la sábana
  aprobada (②, cuando exista F3), el copy aprobado por línea (③) y las piezas y anuncios (④ y ⑤, con
  `avance`: avanzan por línea). Sin CDM encendido, ② no aparece y ③ no tiene candado.
- **Menú por módulo**: My Voice (Pedidos de copy · Copy · Con el cliente · Métricas · Generar suelto ·
  Historial) y **Producción** (Lo mío · Por revisar · Por marca · Con el cliente · Listas para montar ·
  Guías de la biblioteca), que sale del menú de My Voice (decisión 23). Producción ya está separada en el
  servidor (`Pieza`, `permisosPieza.ts`, `revisionDePiezas.ts`, la auditoría): pasa a ser su propio
  módulo en `scripts/mapa/modulos.json`, y `npm run fronteras` la obliga a leer el copy y la guía visual
  por el contrato, no de las tablas de My Voice o CDM. `screens.ts` sigue siendo la única fuente de nombres; las
  etapas de `NAV_STAGES` se reemplazan por los módulos del encabezado.
- **Riesgo**: `App.tsx` concentra el estado (~1000 líneas). Se muda de a una pantalla (spec § 7), con
  el estado que cada una necesita, y nunca hay dos versiones vivas de la misma pantalla.

**F0 va en dos PRs.**

- **F0a (2026-11-19), el marco:**
  - El interruptor `Workspace.plataformaPorProcesos` (migración aditiva) viaja en la sesión
    (`plataformaPorProcesos` en `/auth/me`). Lo prende o apaga **un script, no un botón**:
    `npm run plataforma -- <slug> --encender --apply`. En producción hay muchos ADMIN, y el workspace real
    lo decide Gerardo. `seed:capacitacion` lo deja prendido.
  - `GET /clients/:id/proceso[?campana=]` está en `server/src/plataforma/proceso.ts` (antes en la parte común). Cuenta el ADN, el copy y
    las piezas leyendo las tablas, porque la parte común no importa My Voice. Una campaña de otra marca
    responde 404, y `verify:isolation` lo cubre.
  - Front en `src/plataforma/`:
    - `rutas.ts`: rutas propias, sin librería, porque nginx y Vite ya devuelven `index.html`.
    - `Marco.tsx`: la barra, el proceso con el selector de campaña, el menú del paso y el menú de la cuenta.
  - `App.tsx` arma las pantallas una sola vez (`contenido`), y el interruptor elige en qué marco se
    montan. Con el interruptor apagado, la app es la de hoy.
  - Los pasos que se ven son ① Marca, ② My Voice y ③ Producción, numerados en el orden en que se ven.
    CDM e Implementación se suman cuando existan.
- **F0b (2026-11-19):**
  - Panorama (`GET /panorama`, OWNER/ADMIN): es la entrada de quien administra. Muestra las campañas en
    curso de todas las marcas con sus pasos y qué espera a quién; «Abrir» lleva a la campaña en su paso.
  - El selector dice en qué paso va cada campaña (`GET /clients/:id/campanas/proceso`).
  - La campaña del encabezado filtra Copy y «Por marca» de Producción, y Copy esconde su selector propio.
  - «Generar suelto» y «Con el cliente» quedan como `nombrePorProcesos` en `screens.ts`: el marco de hoy
    conserva sus nombres.
  - «En qué va» una campaña (`pasoEnCurso`) es el primer paso del trabajo sin hacer. El ADN cuenta solo al
    final, porque sin CDM avisa y no frena. Si no, todas las campañas de una marca con el ADN a medias
    dirían «en Marca».
- **F0c (2026-11-19):**
  - Producción es su propio módulo en `modulos.json` y `npm run fronteras` lo vigila: 0 por invertir.
    - My Voice ya no la importa: Copy recibe el alta de piezas como un espacio.
    - El portal del cliente pasa a la plataforma.
    - Producción lee de My Voice solo el spec de los canales, y eso cuenta como contrato.
  - El menú del paso tiene «Lo mío», que es la entrada de Diseño, y «Por marca».
  - Queda como deuda: Producción lee el copy de las tablas de My Voice con `prisma`. Las columnas del
    tablero (Por revisar, Con el cliente, Listas) siguen dentro del tablero y no son entradas del menú.

### F1 · Funciones, entrada por función y modo lectura (decisión 22)

**Esquema** (aditivo): `enum FuncionEquipo` suma `ESTRATEGIA`, `PLANNING` y `TRAFFICKER`
(`ALTER TYPE … ADD VALUE`, una por sentencia). `MiembroFuncion` no cambia: `clientId` nulo = todas las
marcas.

**Servidor**:

- `server/src/comun/permisos.ts` es el único lugar que decide quién actúa, como
  `permisosPieza.ts` hoy para las piezas:
  `PASOS = { ADN: ['ESTRATEGIA'], CDM: ['PLANNING'], COPY: ['COPY'], PRODUCCION: ['DISENO'],
  IMPLEMENTACION: ['TRAFFICKER'] }`;
  `puedeActuar(tenant, paso, clientId)` = OWNER/ADMIN **o** tiene una función del paso en esa marca o en
  todas. Aprobar sigue siendo del responsable de la campaña (`aprobacion.ts`, `permisosPieza.ts`): esto
  no lo toca.
- Cada handler que escribe llama `assertPuedeActuar(tenant, paso, clientId)` **después** del guard de
  tenencia, a la vista en el diff (igual que los guards de `lib/tenancy.ts`, no un middleware genérico).
  Responde **403**: el recurso ya es visible para la persona, así que no hay oráculo de existencia.
- **Se enciende de a poco**, como la cuota: `PERMISOS_POR_FUNCION=observar | aplicar` (por defecto
  `observar`). En `observar` registra en el log quién habría quedado sin poder actuar y no bloquea; se
  pasa a `aplicar` por workspace cuando Equipo tiene las funciones asignadas. Equipo muestra, por marca y
  paso, **quién puede actuar** y avisa si un paso queda sin nadie (solo admins).
- `GET /auth/me` suma `funciones` y `entorno` (la ruta de entrada: la de la primera función en el orden
  del proceso; si tiene varias, la última pantalla que usó, guardada en `User.ultimaRuta`).

**Front**: `usePuedo(paso)` lee lo que devuelve `/auth/me`; un paso en lectura monta la pantalla con
`soloLectura` (sin botones de acción) y la franja `<ModoLectura entorno=… />`. El servidor sigue siendo
la regla: el front solo esconde.

**F1a (2026-11-19), hecho:**
- El enum suma las tres funciones.
- `comun/permisos.ts`, en modo observar.
  - Hoy cuida generar, guardar y editar copy.
  - Se aplica solo con `PERMISOS_POR_FUNCION=aplicar` **y** el workspace con la plataforma encendida.
- La sesión trae `funciones` y `entorno`, y cada persona entra a su paso.
- La franja «Solo lectura» lleva a lo propio.
- Equipo asigna las seis funciones.

**F1b (2026-11-19), hecho:**
- **El ADN para Estrategia.** Las 7 rutas que escriben el ADN y las audiencias pasan de `asManager` a
  `exigirPaso(…, 'ADN', …)`. Esa regla decide siempre, sin modo observar: así solo entra quien un admin
  nombró en Equipo.
- **La pantalla ADN** (`/marca/adn`) es la entrada de Estrategia y la ve cualquier miembro. `AdnDeMarca`
  tiene `soloLectura`: sin función, se ve sin botones.
- **Casos de permisos en `verify:isolation`** (5 casos nuevos), en lugar de un `verify:permisos` aparte:
  - sin función, no escribe el ADN pero sí lo lee;
  - con la función de otra marca, no escribe;
  - en su marca, sí escribe;
  - en otro workspace, recibe 404.

**Sin hacer, a propósito:**
- `soloLectura` en Copy: sus acciones ya son de admin o del responsable.
- `User.ultimaRuta`: el entorno por función alcanza mientras nadie tenga dos.

**Verificación**: `npm run verify:permisos` (nuevo, en CI junto a `verify:isolation`): para cada fila
de la matriz, crea a la persona con su función y prueba que puede leer todos los pasos y actuar solo en
el suyo, y que el admin actúa en todos. Con `observar` no bloquea y lo registra.

### F2 · Biblioteca de medios y medios de la marca (CDM, configuración)

**F2a (2026-11-19), hecho:**
- **Las tablas:** `cdm.prisma`, con `Medio`, `Formato` (la pieza maestra), `FormatoVersion`, `Ubicacion`,
  `CampoDeTexto` y `CargaDePlanilla`, en una migración aditiva.
- **El importador** `cdm/biblioteca/cargarPlanilla.ts`:
  - planifica y aplica en una transacción;
  - versiona solo lo que cambió;
  - deja las filas con errores afuera.
- **El script** `npm run cdm:importar`.
- **Meta cargada en local:** 6 piezas, 34 ubicaciones, 13 por confirmar.

**F2b, primera parte (2026-11-19), hecho:**
- **Módulos por marca.** `ModuloDeMarca` (CDM, Implementación) se prende por marca en Control → Marcas,
  solo el super admin. `GET /clients` trae `modulos`. Era de F1 y faltaba: sin esto, el paso ② no tenía
  dónde aparecer.
- **El paso ② CDM en el encabezado y en el proceso.** Aparece solo en las marcas con CDM. Mientras no
  exista F3, la campaña lo muestra como «Sin planning todavía».
- **La biblioteca para leer.**
  - B1, el catálogo por medio, y B2, el medio por pieza, con los largos como rango y «más corto en».
  - Rutas `GET /cdm/biblioteca` y `/cdm/biblioteca/medios/:id`, para cualquier miembro; lo ajeno
    responde 404.
  - Casos nuevos en `verify:isolation`.

**F2b, segunda parte (2026-11-19), hecho:**
- **Planning edita la biblioteca:** un admin o quien tiene Planning (`exigirPlanning`, sin modo observar).
- **B5, cargar desde planilla.** El navegador lee el `.xlsx` (`src/cdm/leerPlanilla.ts`) y el servidor
  revisa en seco antes de cargar en una transacción (`POST /cdm/biblioteca/cargas`). La revisión muestra
  ubicaciones leídas, piezas, por confirmar, errores, cómo quedan agrupadas y las alertas.
- **Activar u ocultar un medio** (`PUT …/estado`). Solo se activa si cada pieza tiene campos de texto.
- **B4, la guía visual para Diseño:** un lienzo por proporción a escala, con su zona segura, dónde se usa,
  mínimos, archivo, duración, las alertas y «antes de entregar».

**Clases de medio (decisión 29, 2026-11-19), hecho:**
- `Medio.clase`, que puede ser `PAGOS`, `REDES_SOCIALES`, `PROPIOS` o `TRADICIONAL`.
- La biblioteca se agrupa y filtra por clase, y dice quién publica al final.
- La clase se elige al cargar una planilla y Planning la puede cambiar después.
- Nueva función `COMMUNITY` (community manager), que actúa en ⑤ junto al trafficker.

**F2c (2026-11-19), los 14 canales como formatos, hecho:**
- **`npm run cdm:canales -- <slug> [--apply]`** lee `channels/specs` y lleva cada canal al medio de su
  clase:

  | Clase | Medios |
  |---|---|
  | Redes sociales | Instagram, TikTok, YouTube |
  | Pagos | Google |
  | Propios | CRM y web |
  | Tradicional | Radio |

  - `Formato.canal` es el puente con el motor.
  - Correrlo dos veces no crea versiones.
- **Las cantidades de B8 ya estaban resueltas en el código.** Desde el 2026-11-05, `porPieza` dice cuántos
  textos lleva una pieza: push, email, WhatsApp, pop up y rich media llevan uno; el reel, 3 textos en
  pantalla; Google, 10 + 4 + 4.
- **Campos de texto:** se suma la zona `INDICACION` (para Diseño, no se publica) y `orden` (el del spec).
- **B2:** muestra los campos de un formato agrupados por zona, con «N ×» cuando la pieza lleva varios.
- **Es un script y no código de CDM:** lee los specs de My Voice, y CDM no importa My Voice. (con las decisiones de B8 en el `.pen`), las rutas y las
pantallas.

El modelo de datos de F1 a F5 está en [ecosistema/datos/arquitectura-de-datos.md](./ecosistema/datos/arquitectura-de-datos.md)
(vigente desde el 2026-11-19, decisión 28). El esquema ya está partido por módulo (`server/prisma/schema/`):
las tablas de CDM van en `cdm.prisma`.


- Tablas de la arquitectura de datos § 2 (CDM): `Medio`, `Formato`, `FormatoVersion`, `CampoDeTexto`,
  más lo que trae la decisión 18: la **pieza maestra** (tipo de archivo y proporción) con sus
  `Ubicacion` (cada una con sus largos y su alerta «por confirmar»). La guía visual se guarda como datos
  (`guia`: lienzo, zona segura, dónde va cada texto), no como imagen, para dibujarla a escala en B4 y en la
  orden de trabajo de Producción.
- **La biblioteca es del workspace (la agencia), no de una marca** (decisión 25): `Medio` y `Formato`
  llevan `workspaceId` y ningún `clientId`; lo que se agrega queda para todas las marcas.
- `MediosDeMarca` (en la arquitectura, `PaqueteDeFormatos`): los formatos y etapas habituales de una
  marca, que solo **referencian** formatos de la biblioteca; la submarca ve los de su madre más los propios,
  calculado al leer (como el ADN). «Agregar a la biblioteca» desde M1 crea el formato en la biblioteca y lo
  suma a la marca en la misma transacción.
- **Carga desde planilla**: `cdm/biblioteca/cargarPlanilla.ts`, en seco por defecto, con la planilla de
  Meta del repo como primer caso (34 ubicaciones → 6 piezas, 10 alertas).
- **Los 14 canales** se cargan como formatos con `canal` = el valor de `Platform`: es el puente que deja
  a My Voice generar una línea con su spec de hoy hasta que el motor lea los campos del formato.
- Editar la biblioteca es del paso CDM: Planning, sin pedir admin (decisión 25). Guards de tenencia en cada `:id`;
  `verify:isolation` suma las rutas nuevas.

### F3 · Planning y sábana (P1 a P5)

**F3a (2026-11-19), hecho:**
- **Tablas** en `cdm.prisma`:
  - `Planning`, uno por campaña, con versión y estado (`EN_ARMADO`, `POR_APROBAR`, `DEVUELTO`, `APROBADO`);
  - `LineaDePlanning`, formato × etapa × piezas, con su `id` como `lineaId` estable y la versión del formato
    fijada;
  - `EventoDePlanning`, el historial, que no se edita.
- **Las reglas viven en `cdm/planning/planningService.ts`:**
  - lo arma Planning o un admin;
  - solo se usan medios activos;
  - se edita sin enviar o devuelto;
  - lo aprueba o lo devuelve, con comentario, el responsable de la campaña;
  - aprobado, se reabre como versión nueva.
- **Las pantallas** en `src/cdm/Plannings.tsx`: P1 a la lista, P2 nuevo sobre una campaña existente sin pedir
  nombre, P3 medios con piezas por etapa, P4 la sábana con los textos y largos para My Voice, P5 aprobar.
- **El paso ②** queda hecho con la sábana aprobada, y si no, dice en qué va y quién lo debe.

**F3b (1) (2026-11-20, en producción, #95), hecho sin leer el `.pen`** (el acceso al diseño vuelve el 29-nov; se compara entonces):
- **P4b.** Una línea elige sus ubicaciones con casillas (`PUT …/lineas/:lineaId/ubicaciones`).
  - El largo para My Voice pasa a ser el más corto entre las elegidas. Elegirlas todas se guarda como
    «todas».
  - La sábana suma la columna Estado («Listo» o «Ubicación por confirmar»).
- **Avisos y correo,** en la misma transacción que mueve el planning:
  - al enviar, al responsable;
  - al aprobar o devolver, a quien lo armó y lo envió.

  Los tipos son `PLANNING_POR_APROBAR`, `PLANNING_APROBADO` y `PLANNING_DEVUELTO`, y la campana lleva a los
  plannings de la marca.

**F3b (2) (2026-11-20, en producción, #96): el cliente aprueba la sábana por enlace,** en las campañas «con cliente»:
- Cuando el responsable la aprueba, el planning pasa a `CON_EL_CLIENTE` en vez de `APROBADO`.
- El responsable o Planning crean el enlace (`POST …/enlace`, una sesión `RondaRevision.SABANA` de 14 días).
  Si ya hay uno abierto, se devuelve ese.
- El cliente ve la campaña, las fechas y las líneas por etapa, sin nada interno. Aprueba, o devuelve con
  comentario: la sábana queda `APROBADO` o `DEVUELTO` y avisa a quien la armó y al responsable.
- El CHECK del portal pasa de XOR a «exactamente uno» entre copy, pieza y planning.

**F4 (1) (2026-11-20, en producción, #100): los pedidos de copy en Copywriting**, hecho sin el `.pen` (se compara el 29-nov):
- **Un pedido es una línea de una sábana aprobada:** formato, etapa, piezas y el largo de cada texto. No hay tabla
  de pedidos: se leen de CDM y su estado se calcula al leer con el copy guardado (`SavedVariation.lineaDePlanningId`).
  - **Por escribir:** faltan piezas.
  - **En aprobación:** están todas escritas y falta aprobar alguna.
  - **Listo:** todas sus piezas están aprobadas.
- **Copywriting › Pedidos** (`src/myvoice/PedidosDeCopy.tsx`, `GET /copywriting/pedidos`): pestañas por estado y una
  tarjeta por campaña con su avance y sus pedidos agrupados por etapa (Gerardo eligió campaña › pedidos).
- **«Escribir» genera dentro de la tarjeta del pedido** (`src/myvoice/EscribirPedido.tsx`). Usa la voz del brief
  de la campaña y las reglas del pedido: canal, etapa, piezas que faltan y slides del carrusel. Se revisa y se
  guarda ahí mismo; lo guardado queda ligado a la línea, y el servidor rechaza un pedido de otra campaña o de
  otro canal. Gerardo, 2026-11-20: mandar el pedido a Generar suelto confundía. **Generar suelto queda para lo
  que no viene de CDM y deberá cambiar**, porque formatos y etapas los decide CDM. Los dos arman los parámetros
  con la misma función (`src/myvoice/parametrosDelBrief.ts`).
- **Meta Ads en el motor** (2026-11-23). Hasta entonces sus 6 piezas maestras no se podían escribir.
  - Canal `Meta Ads` con texto principal, título y descripción.
  - El pedido manda qué textos lleva la pieza y su largo (`textosDelPedido`), según las ubicaciones elegidas.
  - La planilla de Meta deja sus formatos con ese canal.
- **Deuda:** al guardar, My Voice lee directo la línea de CDM para validarla (`pedidoValido` en `savedController.ts`).

**Lo que falta:**
- Que My Voice espere a la sábana aprobada en las marcas con CDM (regla 2), junto con F4.

- `Planning` y `LineaDePlanning` (en la arquitectura, `Cuadro` y `LineaDeCuadro`; se nombran como dice
  el equipo, decisión 20). Una línea = formato × etapa × piezas (decisión 19), con fechas, las
  ubicaciones elegidas y `lineaId` estable entre versiones. El **largo para My Voice** se calcula al leer:
  el más corto entre las ubicaciones elegidas (decisión 18).
- Estados: sin enviar · por aprobar · aprobada · devuelta. Enviar guarda una **versión completa**
  (contrato § 2.2); el menú cuenta por aprobar y aprobados.
- **La marca aprueba la sábana** (P5) por el portal de revisión: `RondaRevision` suma `SABANA` y el
  `CHECK` de la migración pasa de XOR a «exactamente uno» entre `savedVariationId`, `piezaId` y
  `lineaDePlanningId`. Aprobación interna: el responsable, como el copy.
- El paso ② del encabezado queda «hecho» con la sábana aprobada.

### F4 · Pedidos de copy en My Voice (MV0, MV)

- Al aprobarse una versión de la sábana, el contrato copia sus líneas a My Voice: `EncargoRecibido` y
  `LineaDeEncargo`, con el `FormatoUsado` de cada una (arquitectura § 3). La comparación por `lineaId`
  marca lo nuevo, lo que cambió y lo que salió.
- **Aviso** (decisión 21): `Notificacion` suma `modulo`, `campanaId` y `destino`, con el tipo
  `PEDIDO_COPY`, agrupado por campaña. Les llega a quienes tienen Copy en la marca y al responsable, por
  la campana, Mi cola y el correo.
- **Generar una línea** reusa el motor tal cual: la línea da el `Platform` (del puente de F2), la etapa y
  la cantidad de piezas (`conjuntoId` y `piezaIndex`, como desde el 2026-11-05). `SavedVariation` suma
  `lineaId`. El largo lo sigue fijando el spec del canal; que lo fije la línea es un cambio del motor que
  se mide con `verify:calidad` antes de encenderlo.
- Copy aprobado por línea vuelve a CDM (contrato § 3); si cambia después, la línea queda «a revisar».

### F5 · Implementación (T1 a T5, P6)

**F5 (1) (2026-11-23), hecho sin el `.pen`:** la fase A del plan de Implementación (#65) y la parte de CDM de la C.
- **Módulo nuevo** `implementacion`, en el servidor y en el front, con su propio archivo de esquema
  (`implementacion.prisma`: `Anuncio` y `AnuncioEvento`). Lee la pieza, el copy y la línea por contrato.
- **Un anuncio es una pieza en «Lista».** Su estado (por montar, montado, con novedad) se guarda cuando alguien
  actúa sobre él.
  - **Listo para montar:** pieza aprobada, destino y, si viene de una sábana, fecha de salida.
  - **La UTM no bloquea:** solo avisa.
- **Destino y UTM:**
  - con sábana, en la línea: P6, lo pega Planning en cualquier estado y sin versión nueva;
  - sin sábana, en el anuncio: lo pega el responsable o quien administra.
- **T1 a T4** en ⑤ › «Por montar»:
  - pestañas por estado y tarjetas por campaña;
  - cada anuncio con sus textos y «Copiar», la URL completa, el archivo y quién aprobó;
  - «Marcar montado» (plataforma, ID y fecha), «Devolver con novedad» (motivo y texto, avisa al responsable) y
    «Volver a por montar».
- **Permisos:** monta quien administra o tiene Trafficker o Community.
- **Encabezado:** el paso ⑤ aparece en las marcas con el módulo Implementación prendido (Control › Marcas) y cuenta
  los montados.
- **Falta:**
  - T5, el reporte de lo planeado contra lo montado, con el historial de aprobaciones (fase B);
  - «Mi cola» de todas las marcas;
  - que un cambio después de montado devuelva el anuncio a «por montar» solo.

El detalle está en `docs/plan-implementacion.md` (PR #65, nivel 2). Lo que cambia
con lo diseñado hoy:

- La función `TRAFFICKER` entra en F1, con las otras, y el paso ⑤ del encabezado sale de F0.
- Destino y UTM se guardan en `LineaDePlanning` (P6 y P6b, entrada propia en el menú de CDM) y se editan **sin versión nueva** de la sábana; el
  puente sin CDM (fase A de #65) los guarda en `Anuncio`.
- Un cambio de copy, pieza, destino o UTM después de montado devuelve el anuncio a «por montar» y avisa
  al trafficker: se dispara desde los mismos servicios que hoy resetean la aprobación al editar.
- **Al mergear #65**: sus decisiones 18 a 22 chocan con las de #72 y la 23 de este plan; se renumeran a
  24 a 28.

## Qué no cambia

- Con `plataformaPorProcesos` apagado, el equipo ve la app como hoy.
- Las rutas de hoy conservan su contrato; ninguna marca sin CDM ve un candado nuevo.
- La aprobación sigue siendo del responsable de la campaña (`aprobacion.ts`, `permisosPieza.ts`).
- El portal del cliente sigue sin cuenta y filtrado por marca.

## Diseñado después del plan (2026-11-17)

- **MV2 · Aprobar por grupos** (F4): el copy de una sábana grande se agrupa por etapa y formato y se aprueba
  por grupo, leyendo una muestra. **Aprobar un grupo nunca aprueba un texto con marcas** (validadores, ADN o
  revisor): esos quedan para revisar de a uno. Es `POST /saved/aprobacion` con los ids del grupo menos los
  marcados, calculado en el servidor; la muestra elige textos distintos entre sí, no los primeros.
- **P7 · Cómo va cada línea** (F3 + F4): la sábana aprobada como tablero de la campaña. Cada columna la
  calcula al leer el módulo dueño por contrato (copy de My Voice, piezas de Producción, anuncios de
  Implementación); CDM no guarda ningún estado ajeno.
- **Lo que dejó la auditoría de UX** (decisión 24), repartido en las entregas:
  - F0: el subencabezado separa **dónde estás** (el recuadro) de **cómo va la campaña** (número y texto de
    cada paso, calculados por `GET /clients/:id/proceso`); nunca ✓ con líneas pendientes, y con «Todas las
    campañas» los pasos solo navegan. Una sola marca activa: abrir algo de otra marca cambia marca y campaña
    y lo avisa. **Panorama** (`GET /panorama`, solo OWNER/ADMIN): campañas en curso de todas las marcas, el
    avance por paso y qué está trabado y quién lo debe; es la entrada del admin.
  - F3: la campaña se crea antes que el planning; el formulario del planning no pide nombre.
  - F1/F4: quien aprueba es el responsable (agencia) o el cliente por enlace, según `modoAprobacion`; la sábana
    también. El arreglo de copy de una pieza devuelta se hace en My Voice, no dentro de Producción
    (`corregir-copy` deja de editar el texto desde la pieza).

## Verificación de cada entrega

- Los tres `tsc`, las dos builds, `npm run fronteras` (el código nuevo vive en `comun/`, `cdm/`,
  `myvoice/`, `produccion/`, `src/plataforma/`) y el chequeo de deriva de migraciones.
- `verify:isolation` con cada ruta nueva que toma un `:id`; `verify:permisos` desde F1.
- Recorrerlo con el equipo en una marca piloto con CDM encendido (la marca nueva con ADN completo) antes
  de encenderlo en Terpel.
