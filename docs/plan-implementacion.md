# Plan · Implementación: el espacio del trafficker

Estado: en diseño · 2026-11-05 · Decisiones 18, 19 y 20 en
[ecosistema/decisiones.md](./ecosistema/decisiones.md) · Flujo:
[ecosistema/flujo.md](./ecosistema/flujo.md) pasos 11–12 y § 5 · Requisitos: PL-15 a PL-18 en
[ecosistema/producto/prd-plataforma.md](./ecosistema/producto/prd-plataforma.md)

## Por qué

Hoy el proceso termina cuando la pieza queda en «Lista». A partir de ahí, alguien junta a mano el copy,
la URL, el arte y las aprobaciones para que el trafficker monte los anuncios, y nada vuelve a la
plataforma: no queda registro de qué se montó, dónde ni cuándo.

- El único rastro es el Excel de piezas en «Lista» (`server/src/services/exportPiezasToExcel.ts`). Su
  comentario dice «el insumo del que programa y publica», pero no lleva destino, UTM ni aprobadores.
- El destino no está en la base. `flujo.md` decía «el cliente da la URL final» y el contrato con CDM lo
  había perdido.
- Las aprobaciones estaban pensadas «cada una en su herramienta» (decisión 3). Para el trafficker y el
  cliente eso no sirve: necesitan ver juntas las aprobaciones internas y las del cliente. Ahora quedan
  todas en un solo historial (decisión 19).

## Nivel 1 · Qué ve el usuario (se resuelve en el `.pen`)

### Quién hace qué

| Quién | Qué hace |
|---|---|
| **Planning** | Pega el destino y la UTM en cada línea del cuadro, cuando los tiene. Suele ser al final, y no hace falta una versión nueva del cuadro. |
| **Trafficker** (función nueva, interna) | Monta cada anuncio listo y registra plataforma, ID del anuncio y fecha real. Si no puede, lo devuelve con una novedad. |
| **Responsable** | Revisa el reporte de implementación y lo envía al cliente. Recibe las novedades de copy y pieza. |
| **Cliente** | Recibe el reporte como constancia. |

### Pantallas

1. **Implementación de una campaña.** Usa el mismo recorrido lineal que el resto del proceso. A la
   izquierda van las líneas con su avance (por montar, montados, con novedad). Al centro, **un anuncio
   a la vez**:
   - el copy por campo (en pieza y de plataforma), con «Copiar»;
   - el destino y la UTM, tal como los pegó Planning, y la URL completa con «Copiar»;
   - la pieza: miniatura y enlace al archivo aprobado;
   - quién aprobó qué: copy, pieza y cliente, con fecha.

   La acción principal es **«Marcar montado y seguir»**: plataforma, ID del anuncio y fecha real. La
   secundaria es «Devolver con novedad».
2. **Anuncio con algo que falta.** Dice qué falta y quién lo debe («Falta la UTM · Planning»), con un
   botón para avisarle. No se puede marcar montado.
3. **Devolver con novedad.** Pide qué pasó (destino roto, texto que la plataforma no acepta, medida
   incorrecta, otra cosa) y un texto obligatorio. Va a quien lo debe.
4. **Reporte de implementación.** Muestra, por línea, lo planeado contra lo montado: fechas, IDs,
   novedades y el historial de aprobaciones. Las acciones son «Enviar al cliente» y «Descargar» (Excel y
   PDF).
5. **Historial de aprobaciones de la campaña.** Todas las aprobaciones, internas y del cliente, en
   orden (flujo.md § 5).
6. **En CDM: destino y UTM por línea.** Dos campos para pegar, que se pueden editar sin enviar una
   versión nueva del cuadro.
7. **Mi cola del trafficker.** Los anuncios por montar de todas las marcas, ordenados por fecha de
   salida.

### Reglas

- **Listo para montar** exige cinco cosas: copy aprobado, pieza aprobada (por el cliente si la campaña
  es con cliente), destino, UTM y fecha de salida.
- Si el copy, la pieza, el destino o la UTM cambian después de montado, el anuncio vuelve a «por
  montar» con lo que cambió y el trafficker recibe un aviso. El reporte lo cuenta como desviación.
- El historial no se edita. Un rechazo queda registrado igual que una aprobación.
- My Voice no monta los anuncios ni se conecta a las plataformas. El ID del anuncio se escribe a mano.

### Por decidir con el diseño

- ¿Un anuncio ya montado se puede devolver (por ejemplo, porque la plataforma lo rechazó)? Es la
  pregunta abierta 10.
- ¿El reporte llega al cliente como archivo o en el portal? Es la pregunta abierta 11.

## Nivel 2 · Cómo se construye

Se escribe en detalle cuando el nivel 1 esté validado en el `.pen`. Este es el esqueleto.

### Fase A · Puente sobre v1 (sin CDM)

Sirve para que el trafficker trabaje con lo que existe hoy.

- **Función.** `TRAFFICKER` en `enum FuncionEquipo` (`server/prisma/schema.prisma`, hoy `COPY`,
  `DISENO`, `APROBACION`). Los avisos usan `MiembroFuncion`, igual que Diseño.
- **Modelo `Anuncio`** (aditivo):
  - `piezaId`, `lineaId?` (nulo en v1), `workspaceId`;
  - `destino`, `utm` (texto, tal como se pega);
  - `estado` (`POR_MONTAR` | `MONTADO` | `CON_NOVEDAD`);
  - `plataforma`, `idEnPlataforma`, `montadoEn`, `montadoPorId`, `nota`;
  - `AnuncioEvento` append-only, con el mismo patrón que `PiezaEvento`.
- **Destino y UTM en v1.** Mientras no exista el cuadro de CDM, los pega un manager o el responsable
  en el anuncio. Cuando llegue la línea de CDM, manda la línea.
- **`services/implementacion.ts`** es lo único que decide qué está listo y qué falta. Lee lo que ya
  existe:
  - `SavedVariation` (`aprobadoPor*`) y el copy congelado de la pieza;
  - `PiezaEvento` (`ACEPTADA`) y `ReviewSubmission` / `ReviewItemFeedback` (`ronda PIEZA`);
  - el archivo: `PiezaVersion.claveSnapshot`, que es permanente (el original se borra a los 90 días),
    o `Pieza.enlace`.
- **Permisos** en un solo archivo, como `permisosPieza.ts`:
  - montar o devolver: Trafficker o manager;
  - enviar el reporte: el responsable de la campaña;
  - guards de `lib/tenancy.ts`, con 404 si el recurso es de otro workspace.
- **Paquete:** evoluciona `exportPiezasToExcel.ts` en lugar de duplicarlo. Le suma destino, UTM, URL
  completa, quién aprobó (copy, pieza, cliente) y el estado.
- **Reporte:** Excel y una vista imprimible. No lleva enlace público.
- **Frontend:** la etapa nueva en `screens.ts` entre Producir y Medir y una entrada en `novedades.ts`.

### Fase B · Historial de aprobaciones único (PL-15)

- Un registro común de aprobaciones por campaña en `server/src/comun/`, al que cada módulo escribe por
  contrato. Hoy las aprobaciones están repartidas en `SavedVariation`, `PiezaEvento`, `Hallazgo` y
  `ReviewSubmission`.
- Primero, una **vista de lectura** que las une, sin migrar datos. Después, que cada módulo escriba en
  el registro.

### Fase C · Con CDM

- `destino` y `utm` en la línea del cuadro (contrato, § 2.2).
- CDM lee el estado de implementación por línea (contrato, § 3).

### Verificación

- Las tres compuertas de `tsc` y `npm run fronteras`. Implementación es un módulo de la parte común en
  `scripts/mapa/modulos.json`.
- `verify:isolation`:
  - un anuncio de otro workspace responde 404;
  - el paquete y el reporte no mezclan marcas.
- Recorrido en local:
  1. una pieza en «Lista» sin UTM muestra «Falta la UTM»;
  2. se pega la UTM y el anuncio queda listo;
  3. se marca montado;
  4. el reporte muestra lo planeado contra lo montado, con las aprobaciones.
- `seed:capacitacion` deja un anuncio en cada estado.
