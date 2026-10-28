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

## Antes (2026-10-27), siguen vigentes con los nombres nuevos

- My Voice es la fuente de verdad de la marca: ADN, audiencias y brief existen antes del cuadro.
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
| 1 | ¿Dónde nace la campaña: en My Voice (el brief va primero) o en CDM? | Define quién crea el id y qué pantalla se abre primero. El plan del Adaptador la crea en CDM; nuestras decisiones del 27 oct ponen el brief antes del cuadro. |
| 2 | ¿Qué pasa con el tablero de Producción de My Voice (piezas, auditoría, aprobación del cliente) cuando la marca usa CDM? | Hoy está en producción y se superpone con «Piezas» de CDM. |
| 3 | ¿Avisos y cola compartidos (un servicio) o cada herramienta manda los suyos? | La regla de «un aviso lleva directo a la acción» funciona igual, pero cambia cuánto se construye. |
| 4 | ¿Cómo se identifica la misma marca en las dos herramientas? | Sin eso, el contrato no puede unir datos. |
| 5 | ¿CDM es otra app, otro repo, o vive dentro de My Voice con su propio espacio? | Define despliegue, login y si se comparte base. |
| 6 | ¿La etapa de una línea sale del frente o del objetivo del medio, como propone el plan del Adaptador? | Hoy el frente la define; si el objetivo del medio la cambia, hay dos fuentes para lo mismo. |
| 7 | ¿Versión de marca fijada por campaña? | Si el ADN cambia, las campañas activas no deberían romperse. |
