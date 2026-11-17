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
nuevo detrás del interruptor por marca (`ModuloDeMarca`, spec § 3). El orden sigue la decisión 17: primero
el marco, después la marca hacia adelante.

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
  avance?: {hechas, total} }[]`, en `server/src/comun/proceso.ts`. Usa `completitudAdn` (①), la sábana
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

**Verificación**: `npm run verify:permisos` (nuevo, en CI junto a `verify:isolation`): para cada fila
de la matriz, crea a la persona con su función y prueba que puede leer todos los pasos y actuar solo en
el suyo, y que el admin actúa en todos. Con `observar` no bloquea y lo registra.

### F2 · Biblioteca de medios y medios de la marca (CDM, configuración)

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
  Meta del repo como primer caso (33 ubicaciones → 6 piezas, 10 alertas).
- **Los 14 canales** se cargan como formatos con `canal` = el valor de `Platform`: es el puente que deja
  a My Voice generar una línea con su spec de hoy hasta que el motor lea los campos del formato.
- Editar la biblioteca es del paso CDM: Planning, sin pedir admin (decisión 25). Guards de tenencia en cada `:id`;
  `verify:isolation` suma las rutas nuevas.

### F3 · Planning y sábana (P1 a P5)

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
