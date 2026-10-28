# PRD · Plataforma y parte común

Estado: propuesta · 2026-10-28 · Términos: [../glosario.md](../glosario.md) · Técnico:
[../tecnico/spec-plataforma.md](../tecnico/spec-plataforma.md)

## 1. Resumen

Una sola plataforma con tres módulos (decisión 12): la **parte común**, **My Voice** y **CDM**. La parte
común guarda lo que es de la marca y no de una herramienta: la marca, su ADN, sus audiencias, las
campañas, el equipo con sus funciones, la cola de cada persona y los avisos. Cada marca enciende los
módulos que usa.

## 2. Problema

- La marca se repetía en cada herramienta: dos «Terpel» en producción ya mostraron lo que pasa cuando
  un dato tiene dos dueños.
- Las aprobaciones quedan repartidas entre dos herramientas. Si nadie ve en un solo lugar a quién
  espera una campaña, el trabajo se traba sin que se note.
- My Voice hoy no tiene rutas y concentra todo en una pantalla: sumar CDM encima no es viable.

## 3. Usuarios

| Usuario | Qué hace en la parte común |
|---|---|
| Super Admin | Crea la marca y decide qué módulos usa. |
| Estrategia | Completa y confirma el ADN; define las audiencias. |
| Responsable de la campaña | Crea la campaña y elige por dónde sigue; ve a quién espera. |
| Todos | Usan su cola y sus avisos. |

## 4. Requisitos

| Id | Requisito | P |
|---|---|---|
| PL-1 | Una **barra común** en toda la plataforma: módulo, marca activa, buscar, Mi cola y avisos. | P0 |
| PL-2 | **Crear marca** una vez y encender módulos (My Voice, CDM; Adaptador más adelante). Apagar un módulo oculta sus pantallas, no borra datos. | P0 |
| PL-3 | **ADN y audiencias** en la parte común (ADN 2.0: secciones con estado, mínimo 75 % para crear campañas, la IA propone y Estrategia confirma). | P0 |
| PL-4 | **Crear campaña** con nombre, referencia libre, responsable, fechas y audiencias del ADN (para todas sus líneas), y **elegir cómo sigue**: My Voice o CDM. La otra se suma cuando quiera. | P0 |
| PL-5 | **Vista de campaña en las dos herramientas**: un carril por módulo con los mismos nombres de etapa, «espera a» con la persona y la herramienta, y un botón directo a esa acción. | P0 |
| PL-6 | **Mi cola**: lo pendiente de cada persona en todas las campañas y módulos, por fecha de salida. | P0 |
| PL-7 | **Avisos** que llevan directo a la acción, nunca a una portada ([../flujo.md](../flujo.md) § 4). Por correo, solo lo que le toca a cada uno. | P0 |
| PL-8 | **Funciones del equipo** por marca: Estrategia, Copy, Planning, Diseño, aprobación; el responsable se elige por campaña. | P0 |
| PL-9 | **Inicio de la marca**: ADN, audiencias, formatos de la marca y campañas con su avance. | P1 |

## 5. No objetivos

- Rehacer el login o la tenencia: se reusan los de hoy.
- El Adaptador: fase 3 o 4.

## 6. Cómo se mide

| Qué | Meta |
|---|---|
| Encontrar a quién espera una campaña | En menos de 10 s, sin explicación (prueba con usuarios, [../evals/README.md](../evals/README.md) E-10). |
| Avisos que llevan a la acción correcta | 100 % (cada tipo de aviso tiene destino probado). |
| Marcas duplicadas | 0 nuevas desde que la marca vive en la parte común. |

## 7. Pantallas

En el `.pen`, bajo «— Marco común de la plataforma». Estado en [../pantallas.md](../pantallas.md) y
[../seguimiento.md](../seguimiento.md).
