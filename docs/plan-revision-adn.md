# Plan · Revisar el ADN antes de heredar

Estado: aprobado el 2026-11-04 · Diseño: `.pen`, sección «— Revisar el ADN antes de heredar» (tres
pantallas) · Contexto: decisión 16 y [ecosistema/tecnico/spec-plataforma.md](./ecosistema/tecnico/spec-plataforma.md) § 5b.

## Por qué

El ADN por capas ya está en producción, pero la herencia todavía no empezó. El dry-run de
`backfill:adn` mostró que el ADN de Terpel tiene keywords y prohibiciones de otra marca («AI, ChatGPT,
freelance…») y una guía de tono en la propuesta de valor. Si heredara así, siete submarcas escribirían
con eso. Lo tiene que revisar alguien que conozca la marca, en la herramienta, y no nosotros desde una
terminal.

**La regla nueva: una submarca hereda solo cuando el ADN de su madre está confirmado.** Confirmarlo es
lo que enciende la herencia de esa familia y reemplaza al `--apply` del backfill.

## Nivel 1 · Qué ve el usuario

1. **Marcas.** Si una marca madre con submarcas no tiene el ADN confirmado, arriba aparece un aviso
   ámbar: «Revisá el ADN de Terpel antes de que lo hereden sus 7 submarcas», con lo que va a pasar y
   un botón «Revisar el ADN». La tarjeta de la madre lleva «ADN por revisar · 2 de 5».
2. **La revisión**, dentro de la marca, arriba del detalle. Las 5 secciones (voz, guías, propuesta de
   valor, keywords, prohibiciones), cada una con su texto, cómo la heredan las submarcas («se suman a
   las suyas» o «si no tienen propia») y dos acciones: «Está bien» o «Corregir» (edita ahí mismo y
   guarda como revisada). Arriba, cuántas van y qué submarcas lo heredan. «Confirmar el ADN» se
   habilita con las 5 revisadas.
3. **La bandeja.** Quienes administran el workspace (OWNER y ADMIN) reciben un aviso por marca madre:
   «Revisá el ADN de Terpel: lo van a heredar 7 submarcas». Lleva directo a la revisión y se cierra
   solo al confirmar.
4. **Al confirmar**: «ADN de Terpel confirmado. Sus 7 submarcas ya lo heredan», y la tarjeta pasa a
   «ADN confirmado».

Reglas: solo piden revisión las madres con submarcas; confirman OWNER y ADMIN (Estrategia todavía no
existe en v1); corregir una sección ya revisada la vuelve a dejar revisada con el texto nuevo; editar el
ADN por el formulario de siempre deja esa sección sin revisar si la madre todavía no está confirmada;
después de confirmar, un cambio en la madre llega a las submarcas como hasta ahora.

## Nivel 2 · Cómo se construye

**Datos** (migración aditiva `20261104000001_revision_adn`):
- `Client.adnConfirmadoEn DateTime?` y `Client.adnConfirmadoPorId String?`.
- `SeccionAdn.revisadaEn DateTime?` y `SeccionAdn.revisadaPorId String?`.

**Back** (`server/src/comun/adn/`):
- `resolverAdn`: una submarca hereda solo si su madre tiene `adnConfirmadoEn`. Cierra además un hueco
  vivo: hoy cualquier edición del ADN de una submarca le crea secciones y la herencia empezaría sin
  revisión.
- `guardarAdnDesdeColumnas`: la versión registra la madre solo si está confirmada; la cascada a las
  submarcas, igual. Si cambia el texto de una sección de una madre sin confirmar, su `revisadaEn` vuelve
  a NULL.
- `revisionAdn.ts`: `estadoDeRevision(clientId)`, `revisarSeccion(tenant, clientId, clave, texto?)` (con
  texto escribe la columna, que sigue siendo el espejo de v1) y `confirmarAdn(tenant, clientId)` (exige
  las 5 revisadas; marca la madre, crea las secciones y una versión `madre` en cada submarca, y marca
  leídos los avisos `ADN_POR_REVISAR` de esa marca). Todo en una transacción.
- `avisarAdnPorRevisar(workspaceId?)`: un aviso `ADN_POR_REVISAR` por madre sin confirmar y por
  OWNER/ADMIN, sin duplicar uno abierto. Corre al arrancar el servidor y cuando una marca pasa a tener
  su primera submarca.
- Rutas: `GET /clients/:id/adn/revision` (miembros), `POST /clients/:id/adn/revision/:clave` y
  `POST /clients/:id/adn/confirmar` (OWNER/ADMIN). Guard de workspace y 404 ajeno.
- `GET /clients` suma `adnPorRevisar: { revisadas, total } | null` calculado al leer.

**Front:**
- `components/RevisionDeAdn.tsx` (parte común): el panel de la revisión.
- `ClientManager`: el aviso arriba de la lista, la etiqueta en la tarjeta de la madre y el panel arriba
  del detalle de la marca; abre la revisión si llega `revisarAdnDe`.
- `Bandeja`: icono y color de `ADN_POR_REVISAR`, y su destino es Marcas, no Producción.
- Los textos de Marcas y la novedad del 2026-11-04 dicen «cuando se confirme el ADN de la madre».

**Criterios de aceptación:**
- `verify:adn`: sin confirmar la madre la submarca no hereda aunque tenga secciones; confirmar exige las
  5; al confirmar hereda; corregir una sección cambia la columna y la deja revisada.
- `verify:isolation`: las tres rutas nuevas responden 404 desde otro workspace, y un MEMBER no puede
  revisar ni confirmar.
- Las tres verificaciones de tipos y `npm run fronteras` en verde.
- En producción, después de desplegar: el aviso aparece en Marcas y en la bandeja para Terpel; ninguna
  submarca hereda hasta confirmar.
