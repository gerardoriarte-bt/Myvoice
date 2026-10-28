# Spec · Plataforma y parte común

Estado: propuesta · 2026-10-28 · Producto: [../producto/prd-plataforma.md](../producto/prd-plataforma.md)
· Datos: [../datos/arquitectura-de-datos.md](../datos/arquitectura-de-datos.md)

## 1. Principios

1. **Lo que está en producción no se rompe.** Cambios de esquema aditivos; ninguna ruta actual cambia
   de contrato; lo nuevo se enciende por marca.
2. **Un módulo, una carpeta, sus tablas.** Un módulo no lee las tablas de otro: le pide los datos a su
   servicio. Solo se hablan por el contrato ([../contrato-cdm-my-voice.md](../contrato-cdm-my-voice.md)).
3. **Se reusa lo probado**: login, tenencia (`Membership`, guards de `lib/tenancy.ts`, 404 y no 403),
   `aiClient.ts`, portal de revisión, notificaciones.

## 2. Dónde vive el código

```
server/src/
  comun/        marca, adn/, campana/, equipo/, cola/, avisos/      ← parte común
  myvoice/      brief/, raices/, toolkit/, adaptaciones/, produccion/ (lo de hoy se muda de a poco)
  cdm/          biblioteca/, paquetes/, cuadro/
  contrato/     tipos y funciones que cruzan módulos (lo único importable desde otro módulo)
  lib/, middleware/, services/aiClient.ts   (compartido, como hoy)
src/  (frontend)
  plataforma/   enrutador, barra común, menú por módulo, cola, avisos
  comun/ myvoice/ cdm/   pantallas por módulo
server/prisma/schema/   un archivo por módulo (comun.prisma, myvoice.prisma, cdm.prisma)
```

**Regla de CI**: un archivo de `myvoice/` no importa de `cdm/` ni al revés, y ninguno importa de
`comun/` salvo lo que `contrato/` reexporta. Se chequea con una regla de imports en el job de tipos, con
un archivo sonda que la viola a propósito (como la sonda que ya protege el gate del frontend).

## 3. Módulos encendidos por marca

`ModuloDeMarca { clientId, modulo (MY_VOICE | CDM | ADAPTADOR), encendido, desde }`. Lo cambia el Super
Admin. Un middleware por módulo responde **404** si la marca no lo tiene encendido (una ruta apagada no
se anuncia, igual que un recurso ajeno). Reemplaza a `Workspace.procesoCampana` de `docs/v2`, que era
por workspace y no por marca.

## 4. Frontend

Hoy no hay enrutador y `App.tsx` concentra casi todo el estado. Es lo primero que se construye:

1. **Enrutador** con rutas por módulo: `/marca/:id`, `/campana/:id`, `/myvoice/…`, `/cdm/…`, `/cola`.
   Los parámetros de hoy (`?review=`, `?invite=`, `?pieza=`) se siguen leyendo y redirigen a su ruta.
2. **Marco común**: barra (módulo, marca activa, buscar, Mi cola, avisos) y menú por módulo, como en el
   `.pen` («⚙ Componente · Barra de la plataforma»).
3. Las pantallas actuales se montan **dentro** del marco sin reescribirlas; se mudan a su módulo de a
   una (ver § 7).

## 5. Cola y avisos

Un solo servicio en la parte común. `Notificacion` (ya existe) suma `modulo`, `campanaId` y `destino`
(la ruta exacta de la acción). La cola se calcula al leer, como hoy la etapa del copy: no se guarda un
estado de «pendiente», se deriva de lo que falta en cada módulo. Cada módulo expone, por contrato,
«qué le falta a esta persona en esta campaña».

## 6. Funciones

`FuncionEquipo` suma `ESTRATEGIA` y `PLANNING` (aditivo). El responsable sigue siendo por campaña
(`Project.responsableId`).

## 7. Cómo se construye sin tocar lo que se usa todos los días (propuesta)

- **Mismo repositorio, otra zona**: lo nuevo nace en `comun/`, `myvoice/` (nuevo), `cdm/` y
  `src/plataforma/`. Lo de hoy queda donde está y sigue en producción.
- **Detrás del interruptor por marca**: una marca piloto ve el marco nuevo; las demás, la app de hoy.
- **Se muda de a una pantalla**: cuando una pantalla nueva reemplaza a una vieja, la vieja redirige a la
  nueva y se borra en el PR siguiente. Nunca hay dos versiones vivas de la misma pantalla para la misma
  marca.
- **Ramas cortas sobre `main`**, no una rama larga de v2: cada PR deja `main` desplegable.

## 8. Verificación

- `verify:isolation` se extiende a módulos: una marca sin CDM recibe 404 en `/cdm/*`; un cuadro de otra
  marca o workspace, 404.
- La regla de imports entre módulos corre en CI con su sonda.
- Evals de la plataforma en [../evals/README.md](../evals/README.md).
