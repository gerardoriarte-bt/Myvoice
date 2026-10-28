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
| 3 | ¿Avisos y cola compartidos (un servicio) o cada herramienta manda los suyos? | La regla de «un aviso lleva directo a la acción» funciona igual, pero cambia cuánto se construye. |
| 4 | ¿Cómo se identifica la misma marca en las dos herramientas? | Sin eso, el contrato no puede unir datos. |
| 5 | ¿CDM es otra app, otro repo, o vive dentro de My Voice con su propio espacio? | Define despliegue, login y si se comparte base. |
| 6b | Si la campaña sigue primero por CDM, ¿quién arma los frentes? Propuesta: el frente (audiencia del ADN × etapa) es dato de la campaña, en la parte común; CDM o My Voice pueden agregarlo, y el brief lo completa con cuántos textos raíz y CTA. | Antes solo el brief creaba frentes; con la decisión 7 el cuadro puede llegar primero. |
| 6 | ¿La etapa de una línea sale del frente o del objetivo del medio, como propone el plan del Adaptador? | Hoy el frente la define; si el objetivo del medio la cambia, hay dos fuentes para lo mismo. |
| 7 | ¿Versión de marca fijada por campaña? | Si el ADN cambia, las campañas activas no deberían romperse. |
