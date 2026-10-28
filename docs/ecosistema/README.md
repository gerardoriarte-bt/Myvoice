# Ecosistema LoBueno · CDM + My Voice

Estado: en construcción · desde 2026-10-28

Esta carpeta sigue el trabajo de **dos módulos de una misma plataforma, que funcionan juntos y por
separado** (decisión 12): el
**CDM** (lo usa Planning) y **My Voice** (lo usan Estrategia, Copy y el responsable de la campaña).
El **Adaptador de piezas** es una fase posterior (3 o 4) y aquí solo aparece como el próximo
consumidor del copy.

Se itera **de forma alterna**: una vuelta mejora My Voice, la siguiente construye CDM. Por eso cada
parte tiene su propio documento, y lo que viaja entre las dos se escribe una sola vez, en el
contrato.

## Cómo leer esta carpeta

| Documento | Para qué |
|---|---|
| [glosario.md](./glosario.md) | **El lenguaje común.** Una palabra, un significado. Se lee primero. |
| [ecosistema.md](./ecosistema.md) | Qué es dueño de qué, y cómo funciona cada módulo solo. |
| [flujo.md](./flujo.md) | El recorrido de una campaña: quién, dónde, qué se aprueba y qué se avisa. |
| [contrato-cdm-my-voice.md](./contrato-cdm-my-voice.md) | Lo que un módulo le manda al otro. |
| [decisiones.md](./decisiones.md) | Registro de decisiones con fecha y preguntas abiertas. |
| [seguimiento.md](./seguimiento.md) | **Cada función con su estado de diseño, front y back.** |
| [pantallas.md](./pantallas.md) | Inventario de pantallas con su frame en el `.pen`. |

| Carpeta | Contiene |
|---|---|
| [producto/](./producto/) | PRD: [plataforma](./producto/prd-plataforma.md) · [My Voice](./producto/prd-my-voice.md) · [CDM](./producto/prd-cdm.md) · [la IA en toda la plataforma](./producto/prd-ia.md) |
| [tecnico/](./tecnico/) | Specs: [plataforma](./tecnico/spec-plataforma.md) · [My Voice](./tecnico/spec-my-voice.md) · [CDM](./tecnico/spec-cdm.md) |
| [datos/](./datos/arquitectura-de-datos.md) | Arquitectura de la base: tablas por módulo, relaciones, ids que cruzan, migraciones. |
| [evals/](./evals/README.md) | Qué medimos, cómo y si gasta crédito. |
| [bitacora/](./bitacora/README.md) | Una entrada por sesión de trabajo. |

## El marco común

Una barra igual en toda la plataforma: **módulo** (Marca · My Voice · CDM), **marca activa**, buscar,
**Mi cola** y **avisos**. Cada módulo tiene su menú, con su color (parte común, My Voice verde azulado,
CDM azul). Diseñado en el `.pen` bajo «— Marco común de la plataforma» ([pantallas.md](./pantallas.md)).

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
