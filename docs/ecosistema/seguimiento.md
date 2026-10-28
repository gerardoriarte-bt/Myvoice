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
| Estrategia | ADN de hoy | ● | ● | ● | (v1) |
| Estrategia | ADN 2.0: secciones, mínimo, la IA propone | ◐ | ○ | ○ | PL-3 |
| Estrategia | Audiencias de la marca | ✓ | ○ | ○ | PL-3 |
| Responsable | Nueva campaña y elegir cómo sigue | ✓ | ○ | ○ | PL-4 |
| Responsable | Una campaña en las dos herramientas | ✓ | ○ | ○ | PL-5 |
| Todos | Barra común y rutas | ✓ | ○ | — | PL-1 |
| Todos | Mi cola | ✓ | ○ | ○ | PL-6 |
| Todos | Avisos que llevan a la acción | ✓ | ○ | ◐ | PL-7 |
| Super Admin | Funciones del equipo por marca | ● | ● | ● | PL-8 (suma Estrategia y Planning: ○) |

## My Voice

| Usuario | Función | Diseño | Front | Back | Requisito |
|---|---|---|---|---|---|
| Copy | Generar por canales | ● | ● | ● | (v1) |
| — | Manual de oficio en el motor | — | — | ✓ | MV-1 (PR #43, sin mergear) |
| Copy | Brief del equipo | ◐ | ○ | ○ | MV-2 |
| Copy | Textos raíz por etapa | ◐ | ○ | ○ | MV-3 |
| Responsable | Armar y mandar el toolkit | ✓ | ○ | ○ | MV-4 |
| Cliente | Aprobar el toolkit en el portal | ✓ | ○ | ○ | MV-4 |
| Responsable | Revisar el copy de a uno | ◐ | ○ | ○ | MV-5, MV-6 |
| Responsable | Revisión agrupada (200 líneas) | ○ | ○ | ○ | MV-7 |
| Responsable | Qué texto va en qué formato | ○ | ○ | ○ | MV-9 |
| Responsable | Aprobación de copy por campaña | ● | ● | ● | (v1) |
| Cliente | Aprobar copy y piezas en el portal | ● | ● | ● | (v1) |
| Diseño, responsable | Producción y auditoría de piezas | ● | ● | ● | MV-10 |

## CDM

| Usuario | Función | Diseño | Front | Back | Requisito |
|---|---|---|---|---|---|
| Planning | Biblioteca organizable | ✓ | ○ | ○ | CD-1, CD-2 |
| Planning | Detalle de un formato y versiones | ◐ | ○ | ○ | CD-1, CD-5 |
| Planning | Agregar un medio con sus formatos | ◐ | ○ | ○ | CD-3 |
| Planning | Cargar desde planilla | ◐ | ○ | ○ | CD-4 |
| Planning | Paquetes de la marca | ○ | ○ | ○ | CD-6 |
| Planning | Armar y enviar el cuadro | ○ | ○ | ○ | CD-7 |
| Planning, responsable | Cuadro rápido para campañas chicas | ○ | ○ | ○ | CD-11 |
| — | Los 14 canales cargados en la biblioteca | — | — | ○ | CD-12 |
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
| Limpieza antes de partir (spec-plataforma § 2.2, paso 1) | — | ✓ | — |
| Contrato de la generación en `server/src/contrato/` (§ 2.2, paso 2) | — | ✓ | ✓ |
| Fronteras de módulos y regla de imports en CI | — | ○ | ○ |
| Módulos encendidos por marca | — | ○ | ○ |
| Contrato CDM ↔ My Voice en código | — | — | ○ |
| `verify:isolation` ampliado a módulos | — | — | ○ |
