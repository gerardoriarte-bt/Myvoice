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

### 2.1 Lo que cruza de un módulo a otro hoy

Medido con el mapa del código (Graphify, solo código y sin IA) el 2026-10-28 sobre `main` (`10684ee`).
Cada archivo de hoy está asignado a su módulo en `scripts/mapa/modulos.json`; la lista completa, archivo
por archivo, se regenera en [dependencias-entre-modulos.md](./dependencias-entre-modulos.md) con
`npm run mapa`.

| Desde \ Hacia | Parte común | My Voice | Compartido |
|---|---|---|---|
| **Plataforma** (`App.tsx`, `routes/`, arranque) | 12 | 19 | 14 |
| **Parte común** | · | **3** | 30 |
| **My Voice** | **30** | · | 84 |

(Pares de archivos. CDM todavía no tiene código.)

**Lo que hay que invertir antes de partir carpetas (3).** La parte común no puede depender de My Voice:

| Hoy | Por qué rompe | Cómo se resuelve |
|---|---|---|
| `components/ClientManager.tsx` (Marcas) muestra `GenerationHistory` y `PromptPreview` | La pantalla de la marca, que es común, incrusta piezas de My Voice | **Inversión**: Marcas ofrece un espacio por módulo y My Voice registra ahí su historial y la vista del prompt. Con CDM encendido, CDM registra los paquetes de la marca en el mismo espacio. |
| `controllers/workspaceController.ts` usa `PLANES_VALIDOS` de `lib/planLimits.ts` | Los planes y su cuota son del workspace, no de My Voice | **Mover** `planLimits.ts` a la parte común (junto con `usageService` cuando la cuota cuente también lo que gaste CDM). |

**Lo que tiene que exponer `contrato/` (30 pares, 8 cosas).** My Voice lee la parte común en estos
puntos; hoy importa los archivos directo, mañana solo desde `contrato/`:

| Qué | Archivo de hoy | Lo usan |
|---|---|---|
| Guards de tenencia y `TenantContext` / `TenantError` | `lib/tenancy.ts` | 13 archivos de My Voice (7 controladores y 6 servicios) |
| `AuthRequest` y `handleTenantError` | `middleware/auth.ts` | 7 controladores |
| La clave de IA del workspace | `lib/workspaceSecret.ts` | generar, refinar, auditoría |
| Avisos: `notificar`, `destinatariosDe`, `enviarEnSegundoPlano` | `services/notificacionService.ts` | revisión, piezas |
| Correo de revisión completada | `services/notificationService.ts` | revisión |
| El ADN para el prompt (`renderFingerprintForPrompt`) | `services/voiceFingerprintService.ts` | armado de prompts |
| Nombre de la marca con su madre (`nombreConMadre`) | `marcas.ts` (front) | formulario de generación, Producción |
| Destino de un aviso (`DestinoAviso`) | `components/Bandeja.tsx` (front) | Producción |

**Ajuste de diseño que sale de medir.** `screens.ts` hoy es a la vez el catálogo de nombres de pantalla
(lo usan 7 pantallas de los dos módulos) y el orden de las etapas. Se parte en dos: los **nombres**
quedan compartidos y el **orden y el menú** pasan a cada módulo (el marco común arma el menú con lo que
cada módulo registra).

### 2.2 Antes de partir las carpetas

Lo que el mapa mostró que hay que corregir o alinear, en orden. Cada paso es un PR chico que deja `main`
desplegable (decisión 13).

| # | Qué | Por qué | Estado |
|---|---|---|---|
| 1 | **Limpieza**: se borran `services/geminiService.ts`, `components/Login.tsx`, `components/SettingsManager.tsx` y `components/ui/StatBlock.tsx` (nadie los importaba); se quita el `define` de `vite.config.ts` que inyectaba `GEMINI_API_KEY` en el front, la dependencia `@google/genai` y la instrucción de Gemini del README. | `geminiService` llamaba a la IA desde el navegador. Si alguien volvía a importarlo, la build publicaba la clave. Revisado el 2026-10-28: el bundle de producción **no** tiene ninguna clave (solo el texto de ejemplo `"AIza..."` de Ajustes de IA). Toda llamada a la IA queda en el servidor, por `aiClient.ts`. | ✓ (PR de limpieza) |
| 2 | **Tipos compartidos en `shared/`**: una sola definición de los tipos que viajan entre front y back. | De los 14 tipos que existen en `types.ts` y en `server/src/types.ts`, **7 ya son distintos** (`Client`, `Project`, `SavedVariation`, `User`, `CopyParameters`, `CopyVariation`, `GenerationResponse`): el front espera `dnaProfileId` que el back no declara, el back acepta `marketLocale` y `negativeExamples` que el front no conoce. `contrato/` no puede nacer con dos versiones de cada cosa. `shared/` ya lo importan los dos proyectos y debe seguir sin imports. | ○ |
| 3 | **Las 3 inversiones** de § 2.1: espacio por módulo en Marcas y `planLimits.ts` a la parte común. | La parte común no depende de un módulo. | ○ |
| 4 | **Repartir `types.ts`** (661 líneas, el archivo más conectado del repo): lo común a `shared/`, lo de cada módulo a su carpeta. | Con un solo archivo de tipos, cualquier cambio toca a todos los módulos. | ○ |
| 5 | **Enrutador y marco común** (§ 4). `App.tsx` tiene 1171 líneas y 111 conexiones. | Es el centro de todo el front; las pantallas nuevas no pueden sumarse ahí. | ○ |

Ya alineado y no se toca: no hay dependencias circulares; la única llamada a un modelo de IA es
`chatCompletionConRetry` en `aiClient.ts`; la tenencia (`lib/tenancy.ts`) es el centro del back, como
corresponde.

**Cómo se mantiene.** Se corre `npm run mapa` al cerrar cada sesión, antes de la bitácora
([../bitacora/README.md](../bitacora/README.md)); si cambian los números de esta sección, se actualiza
aquí y se dice en la bitácora. Cuando exista la regla de imports en CI, «hay que invertir» tiene que
estar en 0 para mergear.

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

## 7. Cómo se construye sin tocar lo que se usa todos los días (decisión 13)

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
