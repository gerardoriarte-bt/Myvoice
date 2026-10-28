# Decisiones

Registro con fecha. Lo decidido no se reabre sin una razón nueva; si se reabre, se agrega una entrada
nueva que diga qué cambió y por qué.

## 2026-10-28 · Revisión del plan del Adaptador de piezas

1. **CDM es Planning.** El «módulo Planning» de `docs/v2` es el CDM, una herramienta aparte. Los
   medios y formatos viven en CDM; My Voice **hereda** de cada formato lo que necesita para escribir
   (campos de texto y largos).
2. **Textos raíz y toolkit se mantienen**, solo dentro de My Voice. Aseguran la calidad del copy
   antes de escribir cada formato; no viajan a CDM.
3. **El responsable de la campaña aprueba**, y puede ser alguien de Planning o el ejecutivo de
   cuentas. **Cada aprobación queda en su herramienta.** Por eso la navegación y los avisos tienen
   que entenderse sin explicación.
4. **My Voice solo informa qué texto va en qué formato.** El Adaptador no se construye por ahora:
   es una fase 3 o 4.
5. **Se unifica el lenguaje** ([glosario.md](./glosario.md)): Estrategia (ADN), Planning (CDM).
   **Las audiencias se definen en el ADN y se seleccionan en la campaña**; lo que en el plan del
   Adaptador se llamaba audiencia es la segmentación de pauta. **La referencia es un campo libre.**
6. **CDM y My Voice funcionan juntos y por separado**, y se itera de forma alterna: mejorar My Voice,
   construir CDM. Se sigue en esta carpeta, aparte de `docs/v2`.

## 2026-10-28 · Dónde nace la campaña y dónde queda Producción

7. **Marca, ADN y campaña son transversales.** Se crean una vez, en una parte común a las dos
   herramientas, y **el usuario decide cómo sigue la campaña**: por CDM (armar el cuadro primero) o
   directo a My Voice (brief y textos raíz). Ninguna de las dos es la puerta obligatoria.
8. **Producción se queda en My Voice** (tablero de piezas, auditoría y aprobación del cliente).
   Probablemente se mude al Adaptador cuando exista. CDM muestra el estado de las piezas, no las
   aprueba.

## 2026-10-28 · Qué manda CDM y para quién se escribe

9. **CDM manda el encargo completo**: por línea, medio, formato (con sus campos de texto y su largo),
   **etapa del embudo**, cuántas variaciones y fechas. Pueden ser 10 o 200 líneas. Es lo que My Voice
   necesita para generar. La etapa **sale del cuadro**, no del brief.
10. **Las audiencias se eligen del ADN en la campaña, y cada línea se escribe para todas.** Es una
    decisión estratégica de la campaña, no de cada línea. Por eso desaparece el **frente**
    (audiencia × etapa): los textos raíz se organizan **por etapa**, y las etapas que hacen falta son
    las que trae el cuadro. Lo que `docs/v2` dice de frentes queda reemplazado por esto.
11. **El formato fija el largo máximo.** Una propuesta puede ser más corta, nunca más larga: pasarse
    bloquea la aprobación. Si un texto corto está bien o no, lo decide quien revisa; el mínimo, si un
    formato lo trae, es orientación y no bloquea.

## 2026-10-28 · Una sola plataforma

12. **Una plataforma con módulos separados**: un repositorio, una base, un login y un despliegue.
    Módulos: **parte común** (marca, ADN, audiencias, campaña, usuarios y funciones, avisos y cola),
    **My Voice** y **CDM**. Fronteras estrictas: cada módulo tiene su carpeta y sus tablas, no lee las
    tablas de otro y le habla solo por el contrato; una regla de CI prohíbe importar código entre
    módulos. «Funcionar por separado» se decide **por marca** (qué módulos tiene encendidos), no por
    despliegue. El **Adaptador**, cuando llegue, va como servicio aparte que usa el login y la parte
    común.
    - Por qué: la marca transversal, la tenencia (ya probada con `verify:isolation`), las funciones y
      los avisos existen una sola vez; avisos y cola únicos cumplen «un aviso lleva a la acción».
    - Lo que se paga: un error de un módulo puede afectar al otro (se despliegan juntos); se mitiga
      con el interruptor por marca y la CI.
    - Lo que exige primero: **rutas y un marco común en el frontend** (hoy no hay enrutador y
      `App.tsx` concentra el estado). Es lo primero que se diseña.

## 2026-10-28 · Dónde se construye lo nuevo

13. **Lo nuevo se construye en otra zona del mismo repositorio, sin sobreescribir el My Voice que se usa
    todos los días.**
    - Carpetas nuevas: `server/src/comun/`, `server/src/myvoice/` (lo nuevo), `server/src/cdm/` y
      `src/plataforma/`. Lo de hoy queda donde está y sigue en producción.
    - Una **marca piloto** ve el marco nuevo, detrás del interruptor por marca; las demás, la app de hoy.
    - **Se reemplaza de a una pantalla**: la vieja redirige a la nueva y se borra en el PR siguiente.
      Nunca hay dos versiones vivas de la misma pantalla para la misma marca.
    - **Ramas cortas sobre `main`**: cada PR deja `main` desplegable. Se deja de usar una rama larga de
      v2 en una copia aparte del repositorio.
    - Lo que mejora a los usuarios de hoy (manual de oficio, ADN 2.0) puede entrar antes que el marco.
    - Detalle: [tecnico/spec-plataforma.md](./tecnico/spec-plataforma.md) § 7.

## Antes (2026-10-27), siguen vigentes con los nombres nuevos

- La marca, su ADN y sus audiencias son la fuente de verdad (ahora en la parte común, decisión 7).
- Planning no ve los textos raíz.
- El cuadro trae cuántos copys distintos, no frecuencia ni presupuesto.
- Carruseles: el cuadro dice cuántas láminas; un texto por lámina o un relato repartido se decide en
  la campaña.
- Un formato separa medidas, campos de texto y archivo; la biblioteca se ordena por medio.
- Un medio en borrador no se puede usar en un cuadro.
- La IA sugiere, el equipo decide.

## Preguntas abiertas

| # | Pregunta | Por qué importa |
|---|---|---|
| 8 | ¿Cómo se revisan 200 líneas? Propuesta: generar por tandas según fecha de salida, revisar agrupado por etapa y formato, y **aprobar por muestra** (una de cada grupo; el resto queda aprobado si pasa todos los controles; lo que se pasa del largo o tiene problemas se revisa siempre de a uno). | Revisar de a uno, como está diseñado, sirve para 10 líneas, no para 200. |
| 9 | Si la campaña sigue directo a My Voice, sin cuadro todavía, ¿para qué etapas se escriben los textos raíz? Propuesta: el brief puede marcar etapas previstas, y el cuadro las confirma o agrega. | Con la decisión 9 la etapa sale del cuadro, pero la decisión 7 permite empezar por My Voice. |
| 7 | ¿Versión de marca fijada por campaña? | Si el ADN cambia, las campañas activas no deberían romperse. |
