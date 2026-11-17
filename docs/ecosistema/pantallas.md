# Pantallas · inventario de flujos, pantallas y acciones

Estado: vigente · 2026-10-28 · Diseño: `design/MyVoice_Engine.pen` (local, fuera de git)

Cada pantalla con su acción principal (el único botón para avanzar) y su estado de diseño. Se
actualiza cada vez que se diseña o se cambia una pantalla.

Estados: **diseñada** · **ajustar** (diseñada, pero una decisión nueva la cambia) · **por diseñar**.

## Parte común

| Flujo | Pantalla | Acción principal | Estado | Frame en el `.pen` |
|---|---|---|---|---|
| Marco | Barra de la plataforma: módulo, marca, buscar, Mi cola, avisos | — | diseñada (componente) | ⚙ Componente · Barra de la plataforma |
| Marca | Nueva marca y elegir módulos (Super Admin) | Crear marca y empezar el ADN | diseñada | § Marco · Nueva marca — se crea una vez y se eligen sus módulos |
| Marca | Inicio de la marca: ADN, audiencias, formatos y campañas con «espera a» | Nueva campaña | diseñada | § Marco · Inicio de la marca — lo que es transversal y todas sus campañas |
| Marca | **Recorrido de la marca**: los 6 pasos y las reglas de herencia | — | diseñada | § Marca · Recorrido completo — de crear la marca a su primera campaña |
| Marca | Marcas por familia: madre con submarcas, ADN contando lo heredado | Nueva marca | diseñada | § Marca · Marcas por familia — cada madre con sus submarcas |
| Marca | Nueva submarca: lo que trae de la madre | Crear y definir lo propio | diseñada | § Marca · Nueva submarca — parte de lo que ya tiene su madre |
| ADN | ADN de una submarca, por capas | Guardar | reemplazada por «§ ADN 2.0 · una submarca» | § Marca · ADN de una submarca |
| ADN | Cambiar el ADN de la madre: impacto y versión | Guardar versión nueva | diseñada | § Marca · Cambiar el ADN de la madre — a quién afecta antes de guardar |
| Formatos | Formatos de la marca | — | reemplazada por **M1 · Medios de Terpel** en CDM (borrada del `.pen` el 2026-11-17) | — |
| Equipo | Equipo de la marca: heredado y propio | Invitar | diseñada | § Marca · Equipo de la marca — lo heredado de la madre y las personas propias |
| Campaña | Nueva campaña: referencia, audiencias del ADN, **versión del ADN fija**, tratamiento del ADN y **cómo sigue** | Crear y generar / armar el cuadro | diseñada (2026-11-05) | § Campaña nueva · datos, audiencias del ADN, versión del ADN y cómo sigue |
| Campaña | Una campaña en las dos herramientas: carriles, «espera a», lo que pasó | Ir a la acción que espera | diseñada | § Marco · Una campaña en las dos herramientas — dónde va, qué falta y a quién espera |
| Cola | Mi cola y avisos, de los dos módulos | Ir a la acción | diseñada | § Marco · Mi cola y avisos — lo que te toca, en las dos herramientas |

## My Voice

| Flujo | Pantalla | Acción principal | Estado | Frame en el `.pen` |
|---|---|---|---|---|
| ADN | ADN 2.0 por capas: diez secciones en tres grupos (qué decir · cómo suena · qué no se toca), madre, submarca (igual / propia / suma) y propuesta de la IA sin confirmar | Está bien / Corregir · Completar con IA | construida sin «Completar con IA» (2026-11-12, `components/adn/`) | — Decisión 17 · ADN 2.0 por capas (tres frames) |
| ADN | Campaña nueva con ADN bajo el mínimo | Completar el ADN | diseñada (2026-11-05) | § Campaña nueva · el ADN está bajo el mínimo |
| Brief | Brief de campaña | Pedir textos raíz | ajustar: falta **referencia**; los frentes salen y quedan las audiencias elegidas | § v2 · Brief de campaña |
| Textos raíz | Textos raíz de una etapa | Aprobar / rechazar con motivo | ajustar: por etapa, no por frente | § v2 · Textos raíz |
| Textos raíz | Etapa sin textos raíz | Escribir textos raíz | ajustar: ídem | § v2 · Textos raíz · frente sin raíces |
| Toolkit | Armar y mandar | Mandar el toolkit | diseñada | § v2 · Toolkit · armar y mandar |
| Toolkit | Lo que ve el cliente (portal) | Aprobar / rechazar con comentario | diseñada | § v2 · Toolkit · lo que ve la marca |
| Cuadro | Cuadro recibido de CDM | Revisar lo que se va a escribir | ajustar: era «Plan de medios · importado»; pasa a cuadro de CDM | § v2 · Plan de medios · importado |
| Adaptaciones | Revisión de a uno | Aprobar y seguir | ajustar: separar **copy en pieza** y **copy de plataforma** |
| Adaptaciones | **Revisión agrupada** (cuadros de 200 líneas): por etapa y formato, aprobar por muestra | Aprobar el grupo | por diseñar | § v2 · Adaptaciones de una línea |
| Adaptaciones | Algo que corregir | Acortar | diseñada | § v2 · Adaptaciones · algo que corregir |
| Entrega | **Qué texto va en qué formato** (lo que se informa a CDM) | Enviar a CDM / Descargar | por diseñar | — |
| Producción | Tablero de piezas, auditoría y aprobación | Aceptar / devolver | en producción (H2) | secciones de Producción del `.pen` |

## CDM

Arriba de la columna está el **mapa de navegación** («§ Mapa de navegación de CDM»): cada pantalla con su número (P1–P5 y P4b del trabajo, B1–B8 de la biblioteca, M1 de los medios de la marca) y flechas con la acción que lleva de una a otra; el mismo número está junto al título de cada pantalla. Desde el 2026-11-17 todas las pantallas de CDM están en **su propia columna del `.pen`** (x = 10.000, «══ CDM · columna de pantallas ══»), separada de My Voice: arriba lo vigente, abajo lo reemplazado.

| Flujo | Pantalla | Acción principal | Estado | Frame en el `.pen` |
|---|---|---|---|---|
| Flujo | **Flujo de trabajo de Planning**: marca → planning → medios → sábana → aprobación → copy en My Voice → piezas en Producción | — | diseñado (2026-11-17), en revisión | § Flujo de trabajo · de la marca a la pieza |
| Planning | **Nuevo planning** dentro de la marca activa: nombre, campaña, fechas, etapas, quién aprueba | Seguir: elegir medios | diseñada (2026-11-17), en revisión | § Planning · paso 2 · nuevo planning |
| Planning | **Elegir medios con casillas**; en cada formato (con sus medidas), las etapas y cuántas piezas por etapa; los habituales de la marca vienen marcados; resumen en vivo con piezas por etapa (decisión 19) | Ver la sábana | diseñada (2026-11-17), en revisión | § Planning · paso 3 · elegir medios con casillas |
| Planning | **La sábana**: una fila por formato y etapa, con medidas, piezas, fechas y el largo para My Voice; total por etapa; se envía a aprobar (decisión 19) | Enviar a aprobación | diseñada (2026-11-17), en revisión | § Planning · paso 4 · la sábana de medios y formatos |
| Todos | **Encabezado como proceso** (componente): marca → ① Marca · ADN › ② CDM · Planning › ③ My Voice · Copy, con ✓ y candados (decisión 21) | — | diseñado (2026-11-17), en revisión | § Encabezado · el proceso y cuándo un paso está bloqueado |
| My Voice | **MV0 · Cómo se entera Copy**: la campana, Mi cola, el correo y la franja si la sábana cambia | Abrir los pedidos | diseñada (2026-11-17), en revisión | § My Voice · MV0 · cómo se entera Copy |
| My Voice | **MV · Pedidos de copy desde la sábana**: franja «Llegó de CDM» con enlace a la sábana, una línea por formato y etapa con su estado; medio, etapa, piezas y largo ya vienen decididos; el menú de My Voice abre con «Pedidos de copy» | Escribir las piezas | diseñada (2026-11-17), en revisión | § My Voice · los pedidos de copy que llegan de la sábana |
| Planning | **Plannings de la marca**: arriba lo que espera a alguien (por aprobar, con quién y desde cuándo), después lo aprobado con su avance en My Voice y Producción, y lo no enviado o devuelto | Nuevo planning | diseñada (2026-11-17), en revisión | § Planning · los plannings de la marca |
| Planning | **La marca aprueba la sábana** (paso 5): ordenada por etapa, con medidas, piezas y fechas; aprueba o devuelve con comentario | Aprobar la sábana | diseñada (2026-11-17), en revisión | § Planning · paso 5 · la marca aprueba la sábana |
| Biblioteca | **Catálogo de medios** (la entrada): una tarjeta por medio con sus proporciones, estado y lo que falta confirmar; al abrirlo, sus formatos | Agregar medio | diseñada (2026-11-17), en revisión | § CDM · Biblioteca · el catálogo de medios |
| Biblioteca | **Guía visual para Diseño** (Meta): lienzos a escala con zona segura, dónde va cada texto en el teléfono y checklist antes de entregar; la misma guía va a la orden de trabajo | Descargar plantillas | diseñada (2026-11-17), en revisión | § CDM · Biblioteca · Meta · guía visual para Diseño |
| Biblioteca | **Meta por pieza a producir**: las 33 ubicaciones en 6 piezas, con sus rangos de texto y lo que está por confirmar (decisión 18) | Cargar versión nueva | diseñada (2026-11-17) | § CDM · Biblioteca · Meta por pieza a producir |
| Biblioteca | **Detalle de una pieza** (Video 9:16): largos por ubicación, el más corto marcado, zona segura dibujada, archivo e historial | Marcar como probadas | diseñada (2026-11-17) | § CDM · Biblioteca · Meta · detalle de la pieza Video 9:16 |
| Biblioteca | **Cargar Meta desde la planilla**: 33 filas → 6 piezas, las 10 alertas con su decisión, carga en seco | Activar Meta | diseñada (2026-11-17) | § CDM · Biblioteca · cargar Meta desde la planilla |
| Cuadro | **Una línea elige sus ubicaciones** y el largo para My Voice se ajusta solo (el más corto entre las elegidas) | Enviar versión | diseñada (2026-11-17) | § CDM · Cuadro de materiales · una línea de Meta elige ubicaciones |
| Biblioteca | **Los 14 canales de My Voice ya cargados**, por medio, con origen y estado | Decidir las pendientes | diseñada | § CDM · Biblioteca de medios · los 14 canales de My Voice ya cargados |
| Biblioteca | **Cargar desde My Voice**: decidir dónde va cada texto y qué es su cantidad, cargar en seco y confirmar | Cargar en seco | diseñada | § CDM · Cargar desde My Voice · decidir antes de cargar |
| Biblioteca | **Formato cargado desde My Voice** (Email): origen, campos, cantidades pendientes, archivo que falta | Guardar como versión nueva | diseñada | § CDM · Formato cargado desde My Voice · Email |
| Marca | **M1 · Medios de Terpel**: los medios y formatos que la marca usa siempre, con sus etapas habituales; vienen marcados en P3 y las submarcas los heredan | Guardar | diseñada (2026-11-17), en revisión | § CDM · Medios de Terpel |
| Campaña | Campaña en CDM (desde My Voice) | Armar el cuadro | por diseñar | — |
| Cuadro | Armar y enviar el cuadro | Enviar versión | en curso: la línea con ubicaciones está diseñada | § CDM · Cuadro de materiales · una línea de Meta elige ubicaciones |
| Cuadro | Cuadro rápido | — | no es otra pantalla: es el planning con los medios de la marca ya marcados (decisión 15) | — |
| Estado | Línea con su copy aprobado y el estado de sus piezas | Ver en My Voice | por diseñar | — |
| Seguimiento | Portafolio | — | se quita: lo cubren P1 (por aprobar, aprobados) y Mi cola (decisión 20) | — |
| Seguimiento | Mi cola | Ir a la acción | diseñada en la parte común (cruza los dos módulos) | § Marco · Mi cola y avisos… |

## Entre las dos

| Flujo | Qué | Estado | Frame en el `.pen` |
|---|---|---|---|
| IA | Dónde ayuda la IA en cada etapa y quién decide (refleja [producto/prd-ia.md](./producto/prd-ia.md)) | diseñada | § IA en la plataforma — dónde ayuda y quién decide |
| Seguimiento | Cada función en diseño, front y back (refleja [seguimiento.md](./seguimiento.md)) | diseñada | § Seguimiento · flujo de usuario y funciones (diseño · front · back) |
| Mapa | Quién hace qué en cada herramienta | ajustar: hoy muestra solo My Voice | § v2 · Mapa del proceso: quién hace qué |
| Contrato | Lo que viaja | ajustar: «Planning → proceso de campaña» pasa a CDM ↔ My Voice | § v2 · Contrato Planning → proceso de campaña |
| Navegación | Estado de la campaña visible en las dos herramientas, botones que cruzan | diseñada | § Marco · Una campaña en las dos herramientas… |
| Avisos | Cada aviso de [flujo.md](./flujo.md) § 4 y adónde lleva | diseñada (panel); falta el correo | § Marco · Mi cola y avisos… |
