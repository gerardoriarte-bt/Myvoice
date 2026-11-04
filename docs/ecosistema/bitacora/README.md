# Bitácora de sesiones

Una entrada por día de trabajo, con fecha en el nombre (`AAAA-MM-DD.md`). Se escribe al cerrar la
sesión, no después.

## Al cerrar cada sesión

1. **`npm run mapa`**: regenera el mapa del código y
   [../tecnico/dependencias-entre-modulos.md](../tecnico/dependencias-entre-modulos.md). Es local, sin IA
   y tarda unos segundos.
2. Si cambiaron los números de «hay que invertir» o «pasan por el contrato», se actualiza
   [../tecnico/spec-plataforma.md](../tecnico/spec-plataforma.md) § 2.1.
3. Se actualiza [../seguimiento.md](../seguimiento.md) con lo que cambió de estado.
4. Se escribe la entrada del día con la plantilla.

Las bitácoras anteriores a esta carpeta están en `docs/bitacora-*.md`.

## Plantilla

```markdown
# AAAA-MM-DD · título corto de lo que pasó

Módulos: parte común · My Voice · CDM   (los que se tocaron)

## Qué se hizo
- Diseño: …   (frames del .pen)
- Front / back: …   (PRs)
- Documentos: …   (commits)

## Decisiones
- N. … (enlace a decisiones.md)

## Evals corridas
- E-x: resultado, o «ninguna».

## Mapa del código
- Commit medido · hay que invertir N (antes M) · pasan por el contrato N (antes M) · qué cambió.

## Lo que cambió de lo anterior
- …

## Pendiente
- … (con dueño si lo hay)
```

## Entradas

- [2026-10-27](./2026-10-27.md) · El proceso de campaña v2 de punta a punta en el `.pen`.
- [2026-10-28](./2026-10-28.md) · Del plan del Adaptador al ecosistema CDM + My Voice.
