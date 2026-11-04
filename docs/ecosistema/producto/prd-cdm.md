# PRD · CDM

Estado: por diseñar · 2026-10-28 · Términos: [../glosario.md](../glosario.md) · Técnico:
[../tecnico/spec-cdm.md](../tecnico/spec-cdm.md)

## 1. Resumen

El CDM es el módulo de **Planning**. Es dueño de la **biblioteca de medios**, los **paquetes de
formatos** de cada marca y el **cuadro de materiales**: el encargo de una campaña, de 10 a 200
líneas, que dice qué hay que escribir y producir. Marca, ADN y campaña son de la parte común; la
producción y aprobación de piezas se queda en My Voice (decisión 8).

## 2. Problema

- ~60 formatos por campaña, mantenidos en planillas y en la cabeza de cada planner.
- Las especificaciones (medidas, peso, largo de texto) se pierden entre herramientas, y el copy llega
  sin caber en el formato.
- No hay un solo lugar donde ver qué se encargó y en qué va cada línea.

## 3. Usuarios

| Usuario | Qué hace en CDM |
|---|---|
| Planning | Mantiene la biblioteca y los paquetes; arma, versiona y envía el cuadro. |
| Responsable de la campaña | Puede enviar el cuadro y ve el estado de cada línea. |

## 4. Requisitos

| Id | Requisito | P |
|---|---|---|
| CD-1 | **Biblioteca de medios**: medio → formato → medidas, campos de texto (en pieza o de plataforma, con su largo máximo) y especificaciones de archivo. Una sola, compartida. | P0 |
| CD-2 | La biblioteca se **organiza** por medio, formato, tipo de archivo, largo de texto o fecha de creación: misma lista, otra agrupación; dentro de cada grupo, lo más reciente primero. | P0 |
| CD-3 | **Agregar un medio** con todos sus formatos (de a uno, copiando otro medio o desde planilla). Queda en borrador hasta que cada formato dice qué textos lleva; en borrador no entra a un cuadro. | P0 |
| CD-4 | **Cargar desde planilla** con revisión antes de cargar: lo nuevo, lo que cambia y lo que tiene errores (que no se carga). | P0 |
| CD-5 | **Versiones**: cambiar un formato crea una versión; lo ya escrito sigue con la suya. | P0 |
| CD-6 | **Paquetes de formatos** de la marca: los que usa habitualmente. | P1 |
| CD-7 | **Cuadro de materiales**: líneas con medio, formato, etapa, variaciones, láminas y fechas. Se arma, se versiona y se envía completo cada vez. | P0 |
| CD-8 | **Estado por línea**: copy aprobado y estado de las piezas, leídos de My Voice. | P0 |
| CD-9 | **Portafolio** de campañas con su etapa y «espera a». | P1 |
| CD-10 | **Funciona solo**: sin My Voice, el copy se escribe a mano en cada campo, con los mismos largos. | P1 |
| CD-11 | **Cuadro rápido** para campañas chicas: pocas líneas en minutos, desde los paquetes de la marca. Toda campaña con My Voice tiene su cuadro en CDM (decisión 15). | P0 |
| CD-12 | **Los 14 canales de My Voice** cargados como formatos de la biblioteca, con sus campos y largos de hoy. | P0 |

## 5. No objetivos

- El media plan y el presupuesto (se quedan en los Sheets de Planning).
- Escribir copy con IA (es de My Voice).
- Producir o aprobar piezas (es de My Voice hasta que exista el Adaptador).

## 6. Orden propuesto

1. Biblioteca (CD-1 a CD-5) con los 14 canales cargados (CD-12): es lo que hereda My Voice.
2. Cuadro con el contrato (CD-7) y cuadro rápido (CD-11).
3. Estado por línea (CD-8).
4. Paquetes y portafolio (CD-6, CD-9).

Conviene que la biblioteca y el cuadro existan cuando My Voice llegue a su paso 6
([prd-my-voice.md](./prd-my-voice.md) § 5).

## 7. Cómo se mide

| Qué | Meta | Eval |
|---|---|---|
| Errores de especificación que llegan a Producción | 0 | E-7 |
| Formatos cargados desde planilla sin error | Los errores se ven antes de cargar, 100 % | E-7 |
| Tiempo para armar un cuadro de 60 líneas | A definir con el piloto | E-10 |
