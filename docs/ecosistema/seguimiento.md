# Seguimiento · flujo de usuario y funciones (diseño · front · back)

Estado: vigente · 2026-10-28 · Se refleja en el `.pen` en «§ Seguimiento · flujo de usuario y
funciones», pero **este documento es la fuente**: el `.pen` es local y no está en git.

Cada función con su estado en las tres pistas. Se actualiza en el mismo PR que cambia el estado.

**Estados:** ● en producción · ✓ hecho · ◐ en curso o por ajustar · ○ por hacer · — no aplica

## Parte común

| Usuario | Función | Diseño | Front | Back | Requisito |
|---|---|---|---|---|---|
| Super Admin | Marcas y submarcas | ● | ● | ● | (v1) |
| Super Admin | Nueva marca y elegir módulos | ✓ | ○ | ○ | PL-2 |
| Super Admin | Marcas por familia | ✓ | ○ | ○ | PL-10 |
| Super Admin | Nueva submarca que hereda de su madre | ✓ | ○ | ○ | PL-11 |
| Estrategia | ADN de una submarca por capas | ✓ | ○ | ✓ | PL-11 (back: `comun/adn/`, `GET /clients/:id/adn`) |
| Super Admin | Revisar el ADN de la madre antes de heredar (aviso en Marcas, revisión por sección, bandeja) | ● | ● | ● | PL-11 · [plan-revision-adn](../plan-revision-adn.md) |
| Estrategia | Cambiar el ADN de la madre: impacto y versión por campaña | ✓ | ○ | ◐ | PL-12 (versiones y cascada ✓; fijar la versión por campaña espera a la pantalla) |
| Planning | Medios de la marca: una selección de la biblioteca de la agencia (decisión 25) | ✓ | ○ | ○ | PL-13, CD-6 · F2 |
| Super Admin | Equipo de la marca (heredado y propio) | ✓ | ○ | ○ | PL-14 |
| Estrategia | ADN de hoy | ● | ● | ● | (v1) |
| Estrategia | ADN 2.0 por capas: secciones, mínimo, la IA propone, confirmar | ✓ | ◐ | ◐ | PL-3, PL-11 (F1–F3 ●, F4 ✓: el motor lee las secciones; falta la IA, F5) · [plan-adn-2](../plan-adn-2.md) |
| Estrategia | Audiencias de la marca | ✓ | ✓ | ✓ | PL-3 (la campaña las elige en F6) |
| Responsable | Nueva campaña: audiencias del ADN, versión fija, cómo sigue | ✓ | ○ | ◐ | PL-4, PL-12 (`Project.adnVersion` ●) · [plan-adn-2](../plan-adn-2.md) F6 |
| Responsable | Una campaña en las dos herramientas | ✓ | ○ | ○ | PL-5 |
| Todos | Barra común y rutas | ✓ | ✓ | — | PL-1 · F0a, detrás del interruptor |
| Todos | Encabezado en dos filas: dónde estás y cómo va la campaña en los cinco pasos (decisiones 23, 24, 26) | ✓ | ✓ | ✓ | F0a: marco, rutas y `GET /clients/:id/proceso`; F0b: Panorama, filtro por campaña, paso de cada campaña; F0c: Producción como módulo · [plan-plataforma-por-procesos](../plan-plataforma-por-procesos.md) |
| Admin | Panorama: todas las campañas, qué está trabado y quién lo debe | ✓ | ✓ | ✓ | F0b · decisión 24 |
| Super admin | Control: interruptores, usuarios de todas las empresas y gasto de IA; los costos solo para él (decisión 27) | ✓ | ✓ | ✓ | `User.superAdmin`, `npm run superadmin` |
| — | Interruptor `Workspace.plataformaPorProcesos` (lo nuevo no se ve hasta encenderlo; `npm run plataforma`) | — | ✓ | ✓ | F0a · plan, «Convivencia con producción» |
| Todos | La plataforma habla de tú (español de Colombia, sin voseo) | ● | ● | ● | #73, desplegado el 2026-11-17 |
| Todos | Entrada por función y franja «Solo lectura» (decisión 22) | ✓ | ✓ | ✓ | F1a + F1b (ADN para Estrategia, casos en `verify:isolation`) |
| Todos | Mi cola | ✓ | ○ | ○ | PL-6 |
| Todos | Avisos que llevan a la acción | ✓ | ○ | ◐ | PL-7 |
| Super Admin | Funciones del equipo por marca | ● | ● | ● | PL-8 (Estrategia, Planning y Trafficker: ✓ en F1a) |
| Todos | «Por aprobar · N» en el encabezado: sábanas, copy y piezas que esperan tu decisión | ○ | ● | ● | decisión 30 · #98, 2026-11-20 (hecho sin el `.pen`) |
| Admin | Quién aprueba se maneja en Equipo: la función Aprobación por marca aprueba sus campañas | ○ | ✓ | ✓ | decisión 30, cambio del 2026-11-23 (reemplaza «Sumar aprobador» por campaña) |

## My Voice

| Usuario | Función | Diseño | Front | Back | Requisito |
|---|---|---|---|---|---|
| Copy | Generar por canales | ● | ● | ● | (v1) · en el marco por procesos se llama «Generar suelto» y queda para lo que no viene de CDM |
| Copy | Pedidos de copy: por campaña y estado, escritos dentro de su tarjeta | ○ | ● | ● | F4 (1) · #100, 2026-11-20 (sin el `.pen`); Meta Ads escribible desde el 2026-11-23 |
| Copy | Aviso «Hay copy por escribir» al aprobarse la sábana | — | ● | ● | decisión 31 · #99 |
| — | El ADN manda en la generación | — | — | ● | decisión 14 (2026-10-28) |
| — | Manual de oficio en el motor | — | — | ● | MV-1 (PR #43, desplegado el 2026-11-04) |
| Copy | Brief del equipo | ◐ | ○ | ○ | MV-2 |
| Copy | Textos raíz por etapa | ◐ | ○ | ○ | MV-3 |
| Responsable | Armar y mandar el toolkit | ✓ | ○ | ○ | MV-4 |
| Cliente | Aprobar el toolkit en el portal | ✓ | ○ | ○ | MV-4 |
| Responsable | Revisar el copy de a uno | ◐ | ○ | ○ | MV-5, MV-6 |
| Responsable | Revisión agrupada (200 líneas) | ○ | ○ | ○ | MV-7 |
| Responsable | Qué texto va en qué formato | ○ | ○ | ○ | MV-9 |
| Responsable | Aprobación de copy por campaña | ● | ● | ● | (v1) · 2026-11-23: Copy con el carril primero y «Crear enlace para el cliente» siempre a la vista ✓ |
| Cliente | Aprobar copy y piezas en el portal | ◐ | ● | ● | (v1) · 2026-11-23: el copy por medio y por pieza, con contexto e instrucciones, en los 14 medios (#104, #105); sin el `.pen` |
| Diseño, responsable | Producción y auditoría de piezas | ● | ● | ● | MV-10 |

## CDM

| Usuario | Función | Diseño | Front | Back | Requisito |
|---|---|---|---|---|---|
| Planning | Biblioteca organizable | ✓ | ◐ | ◐ | CD-1, CD-2 · F2b: catálogo (B1), medio por pieza (B2), guía visual (B4), activar; falta «organizar por» |
| Planning | Detalle de un formato y versiones | ✓ | ○ | ○ | CD-1, CD-5 (Meta, por pieza: decisión 18) |
| Planning | Agregar un medio con sus formatos | ✓ | ○ | ○ | CD-3 (Meta desde la planilla) |
| Planning | Cargar desde planilla | ◐ | ✓ | ✓ | CD-4 · F2a: importador; F2b: pantalla B5 (el navegador lee el .xlsx, el servidor revisa en seco) |
| Planning | Paquetes de la marca | ○ | ○ | ○ | CD-6 |
| Planning | Armar, enviar y aprobar la sábana (P1 a P5) | ◐ | ● | ● | CD-7 · F3a; F3b (#95, #96): ubicaciones por línea (P4b), avisos y aprobación del cliente por enlace; P4b y P5 sin el `.pen` |
| Planning, responsable | Cuadro rápido para campañas chicas | ○ | ○ | ○ | CD-11 |
| Planning | Los 14 canales cargados en la biblioteca | ◐ | ✓ | ✓ | CD-12 · F2c: `npm run cdm:canales`, cada canal en el medio de su clase; las cantidades de B8 ya las fija `porPieza` |
| Planning | Clases de medio: Pagos, Redes sociales, Propios, Tradicional | ✓ | ✓ | ✓ | decisión 29 |
| Planning | Estado por línea | ○ | ○ | ○ | CD-8 |
| Planning | Portafolio | ○ | ○ | ○ | CD-9 |

## IA

Detalle y prioridad de cada uso en [producto/prd-ia.md](./producto/prd-ia.md). Diseño = la pantalla
donde aparece la propuesta de la IA.

| Id | Uso de la IA | Diseño | Front | Back | P |
|---|---|---|---|---|---|
| IA-1 | Propone el ADN | ✓ | ○ | ○ | P0 |
| IA-4 | Campaña desde el brief del cliente | ○ | ○ | ○ | P0 |
| IA-7 | Leer especificaciones y proponer formatos | ○ | ○ | ○ | P0 |
| IA-10 | Cuadro borrador desde el media plan | ○ | ○ | ○ | P0 |
| IA-12 | «Sugerir» en el brief | ✓ | ○ | ○ | P0 |
| IA-14 | Textos raíz por etapa | ✓ | ○ | ○ | P0 |
| IA-16 | Copy por formato, revisor y corrector | ● | ● | ● | P0 |
| IA-17 | «Acortar» | ✓ | ○ | ○ | P0 |
| IA-18 | Revisión por muestra | ○ | ○ | ○ | P0 |
| IA-19 | Auditoría de piezas | ● | ● | ● | P0 |
| IA-21 | Rechazos → reglas propuestas para el ADN | ○ | ○ | ○ | P1 |
| IA-2, 3, 5, 9, 11, 13, 15 | Resto de P1 | ○ | ○ | ○ | P1 |

## Base técnica

| Función | Diseño | Front | Back |
|---|---|---|---|
| Mapa del código y dependencias entre módulos (`npm run mapa`) | — | ✓ | ✓ |
| Limpieza antes de partir (spec-plataforma § 2.2, paso 1) | — | ● | — |
| Contrato de la generación en `server/src/contrato/` (§ 2.2, paso 2) | — | ● | ● |
| Fronteras de módulos y regla de imports en CI (`npm run fronteras`) | — | ✓ | ✓ |
| Módulos encendidos por marca | — | ✓ | ✓ |
| Contrato CDM ↔ My Voice en código | — | — | ○ |
| `verify:isolation` ampliado a módulos | — | — | ○ |
