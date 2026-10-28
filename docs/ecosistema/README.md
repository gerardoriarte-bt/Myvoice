# Ecosistema LoBueno · CDM + My Voice

Estado: en construcción · desde 2026-10-28

Esta carpeta sigue el trabajo de **dos herramientas que funcionan juntas y por separado**: el
**CDM** (lo usa Planning) y **My Voice** (lo usan Estrategia, Copy y el responsable de la campaña).
El **Adaptador de piezas** es una fase posterior (3 o 4) y aquí solo aparece como el próximo
consumidor del copy.

Se itera **de forma alterna**: una vuelta mejora My Voice, la siguiente construye CDM. Por eso cada
parte tiene su propio documento, y lo que viaja entre las dos se escribe una sola vez, en el
contrato.

## Cómo leer esta carpeta

| Documento | Para qué |
|---|---|
| [glosario.md](./glosario.md) | **El lenguaje común.** Una palabra, un significado, en las dos herramientas. Se lee primero. |
| [ecosistema.md](./ecosistema.md) | Qué es dueño de qué, y cómo funciona cada herramienta sola. |
| [flujo.md](./flujo.md) | El recorrido de una campaña: quién hace qué, en qué herramienta, dónde se aprueba y qué se notifica. |
| [contrato-cdm-my-voice.md](./contrato-cdm-my-voice.md) | Lo que una herramienta le manda a la otra. |
| [my-voice.md](./my-voice.md) | Qué cambia en My Voice y en qué orden. |
| [cdm.md](./cdm.md) | Qué hay que construir en CDM. |
| [pantallas.md](./pantallas.md) | El inventario de flujos, pantallas y acciones de cada herramienta, con su estado de diseño. |
| [decisiones.md](./decisiones.md) | Registro de decisiones con fecha. Lo decidido no se discute de nuevo sin una razón nueva. |

## Reglas de trabajo

1. **Diseño primero.** Los flujos, pantallas y acciones se dibujan en el `.pen` antes de codificar;
   `pantallas.md` dice qué está diseñado, qué no y dónde está cada frame.
2. **Un dato, un dueño.** Ninguna herramienta redefine un dato de la otra: lo lee.
3. **Cada aprobación queda en su herramienta.** Por eso la navegación y las notificaciones tienen
   que entenderse sin explicación: siempre se sabe dónde está una campaña, qué falta y a quién le
   toca.
4. **Las dos funcionan solas.** Ningún flujo de una herramienta puede exigir la otra para terminar.
5. **El glosario manda.** Si una pantalla, un documento o el código usan otra palabra, se corrige
   la pantalla, el documento o el código.

## Relación con lo anterior

- `docs/v2/` sigue siendo el **detalle técnico del proceso de campaña dentro de My Voice** (modelo
  de datos, API, motor). Donde contradiga a esta carpeta, gana esta carpeta y se corrige `docs/v2`.
- `docs/v2/contrato-plan-de-medios.md` queda reemplazado por
  [contrato-cdm-my-voice.md](./contrato-cdm-my-voice.md): el «módulo Planning» que suponía es el CDM.
- Fuente: *Adaptador de Piezas — Plan de producto* (Grupo LoBueno, octubre 2026), revisado el
  2026-10-28.
- Si CDM pasa a tener su propio repositorio, `cdm.md` y el contrato se mudan con él y aquí queda el
  enlace.
