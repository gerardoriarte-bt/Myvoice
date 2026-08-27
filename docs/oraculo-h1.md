# Oráculo H1 — Veredicto del lote

> Auditoría final del lote H1 (A0, A0.6, A1 parcial, B0, B1, B2, B3) sobre el árbol de trabajo.
> Referencia: [plan-h1-multitenant-motor.md](./plan-h1-multitenant-motor.md) · [ROADMAP](./ROADMAP.md)
> Fecha: 2026-08-27

## VEREDICTO

**Sí se despliega, con un bloqueante previo de ~1 hora: la gate de tipos declarada en
`CLAUDE.md:44-48` no verifica el frontend en absoluto, así que los 12 archivos de UI de este
lote nunca fueron chequeados. Instalar `@types/react` / `@types/react-dom`, correr la gate de
verdad y resolver los 4 errores que aparecen — uno de ellos un bug de datos real, preexistente
— antes de tocar producción.**

Lo que sí está verificado y en verde:

| Gate | Resultado real (corrido por el oráculo) |
|---|---|
| `npx tsc --noEmit` (raíz) | **0 errores**, exit 0 — pero ver F1: es un verde falso para el frontend |
| `cd server && npx tsc --noEmit` (`strict: true`) | **0 errores**, exit 0 — este sí es real |
| `npm run build` (raíz) | **exit 0**, `built in 1.45s`, 1776 módulos, `dist/assets/index-BtsdaRwG.js` 509 KB |

El backend del lote está genuinamente verificado: `server/tsconfig.json:8` tiene `strict: true`
y cubre `src/**/*`, que es donde vive todo el código de tenancy, costo, cuota y resiliencia.
Las guardas de `lib/tenancy.ts` están aplicadas en los 6 controllers que operan por `id`
(28 llamadas), y `chat.completions.create` sigue teniendo un único call site
(`aiClient.ts:472`), como manda la arquitectura.

**Hallazgos que sobrevivieron a la refutación previa: 0.** La lista llegó vacía a este agente
— ningún validador propagó un ítem. Los seis hallazgos de abajo son de la verificación
independiente del oráculo, no de esa lista, y cada uno viene con su reproducción.

---

## Hallazgos, por severidad

### F1 · CRÍTICO — La única gate del repo no chequea el frontend

`tsconfig.json` (raíz) no define `strict` en ningún lado, y `package.json:19-27` no declara
`@types/react` ni `@types/react-dom`. React 19 no trae tipos propios: sin esos paquetes, con
`noImplicitAny` apagado por defecto, `import React from 'react'` resuelve a `any` **en
silencio** y arrastra a todo el árbol de componentes. Props, hooks, handlers y el estado
completo de `App.tsx` son `any` para el compilador.

`CLAUDE.md:44-48` dice que este comando es el único gate y que hay que correrlo antes de dar
cualquier cambio por terminado. Certifica en verde código que no leyó.

**Escenario de falla:** todo el frontend de este lote —`App.tsx` (+185 líneas),
`UserManager.tsx` (reescrito, 313 líneas), `FailedChannelsPanel.tsx` (nuevo), y 9 componentes
más— entró al árbol sin una sola verificación de tipos. `npm run build` usa esbuild y tampoco
chequea. El primer lector del código es el navegador del usuario.

**Reproducción** (probada, el árbol quedó como estaba):

```
# una sonda con 3 errores deliberados en la raíz del repo
npx tsc --noEmit   → 0 errores
```

Los tres errores (asignar `string` a un `useState<number>`, llamar un callback de arity 0 con
3 argumentos, leer una propiedad inexistente de un `string`) pasaron sin una advertencia.

**Arreglo mínimo:**

```bash
npm i -D @types/react@^19 @types/react-dom@^19
```

y en `tsconfig.json` raíz, `"strict": true`. Medido: con solo instalar los tipos —sin activar
`strict`— la gate pasa de 0 a **4 errores**, todos en `App.tsx`, y son F2, F4 y F5 de esta
lista. Con `strict` activado la cifra es mucho mayor y no se puede pagar de una sentada: la
secuencia correcta es tipos primero (4 errores, todos accionables hoy), `strict` después con
su propio ticket.

---

### F2 · ALTO — Una `Promise` viaja como `projectId` hasta la API

`components/ResultsTable.tsx:209`

```ts
const projectId = onCreateProject(newProjectName);
onSave(variation, projectId);
```

El prop está declarado `onCreateProject: (name: string) => string`
(`ResultsTable.tsx:19`), pero lo que se le pasa desde `App.tsx:756` es `createProject`, que es
`async (name: string): Promise<string>` (`App.tsx:491`). `handleCreateAndSave` no hace `await`.

**Escenario de falla:** el usuario está en la tabla de resultados, escribe un nombre de
proyecto nuevo y le da a guardar en el mismo gesto. `projectId` es un objeto `Promise`, no un
string. Baja por `handleSaveVariation` (`App.tsx:503`) hasta
`libraryApi.saveVariation({ ..., projectId })`, y `JSON.stringify` de una `Promise` es `{}`.
La variación se guarda con un `projectId` basura o se rechaza en el server. El camino de
"guardar en un proyecto que ya existe" no pasa por acá y funciona bien, que es por qué nadie
lo vio.

**No lo introdujo este lote:** `createProject` ya era `async` en `HEAD`
(`git show HEAD:App.tsx:416`) y el `git diff` de `ResultsTable.tsx` no toca esas líneas. Es un
bug preexistente que este lote **reveló** al auditar la gate — y que la gate lleva meses sin
poder ver, que es exactamente el argumento de F1.

**Arreglo mínimo:** declarar el prop `(name: string) => Promise<string>` en
`ResultsTable.tsx:19` y `SavedManager.tsx:17`, y hacer `handleCreateAndSave` `async` con
`const projectId = await onCreateProject(newProjectName);`.

---

### F3 · MEDIO — Los backfills que escriben en producción se compilan sin `strictNullChecks`

`server/tsconfig.json:14` limita el alcance a `include: ["src/**/*"]`. Los seis scripts de
`server/scripts/` y todo `server/prisma/` quedan fuera, y los cubre únicamente el tsconfig
raíz, que no tiene `strict`. Es decir: el código que corre `--apply` contra la base de
producción es el **menos** verificado del repo.

Son `backfillTenancy.ts`, `backfillCostTelemetry.ts`, `backfillSlots.ts`,
`recryptWorkspaceKeys.ts`, `verifyIsolation.ts` y `verifyResiliencia.ts` — los tres primeros
son pasos obligatorios de la secuencia de migración documentada en `CLAUDE.md:176-179`.

**Escenario de falla:** un `row.workspaceId` que el tipo de Prisma declara `string | null` se
usa como `string` en un backfill. El compilador no dice nada. El script corre con `--apply`
dentro de una transacción, revienta a mitad de camino con un `TypeError` sobre `null`, y aunque
la transacción revierta, el operador queda con una migración a medias y un runbook parado en el
paso 4.

**Reproducción** (probada): un archivo con `const f = (x: string | null) => x.toUpperCase()`
en `server/scripts/` pasa `npx tsc --noEmit` desde la raíz sin un error.

**Arreglo mínimo:** que el tsconfig raíz deje de abarcar `server/` (agregarlo a `exclude`), y
un `server/tsconfig.scripts.json` que extienda el del server con
`include: ["src/**/*", "scripts/**/*", "prisma/**/*"]`. Así cada proyecto se chequea con la
config con la que realmente se compila — hoy el raíz revisa el server con
`moduleResolution: "bundler"` y `module: "ESNext"`, que no es como se emite (NodeNext → CJS).

---

### F4 · MEDIO — El estado `users` promete `User[]` y contiene `WorkspaceMember[]`

`App.tsx:880` — `<UserManager members={users} />`, con `users: User[]` (`App.tsx:94`).
`UserManager` espera `WorkspaceMember[]`. Este cambio **sí es de este lote**: el prop pasó de
`users={users}` a `members={users}` sin que el tipo del estado siguiera.

En runtime no rompe: `services/api.ts:52` (`authApi.list()` → `GET /users`) está aliaseado en
`routes/index.ts:56` al mismo `workspaceController.listMembers` que sirve
`/workspace/members`, así que las dos rutas de carga devuelven la misma forma. El bug es de
contrato, no de datos — hoy.

**Escenario de falla:** el alias de compatibilidad de `routes/index.ts:54-56` está marcado como
transitorio. El día que `/users` vuelva a devolver `User` de verdad, `UserManager` va a leer
`member.role` y mostrar `User.role` —la columna legacy que `CLAUDE.md:134` describe como "no
autoriza nada"— en el panel donde un admin decide quién es OWNER. Un usuario con `role: ADMIN`
legacy y membresía `MEMBER` se dibujaría como ADMIN. El compilador ya lo está avisando; nadie
lo puede oír por F1.

**Arreglo mínimo:** `const [users, setUsers] = React.useState<WorkspaceMember[]>([])` en
`App.tsx:94`, y tipar `workspaceApi.members()` para que devuelva `WorkspaceMember[]`.

---

### F5 · BAJO — `Client` no declara `dnaProfiles`, pero tres sitios la leen

`App.tsx:872` escribe `{ ...c, dnaProfiles: [...(c.dnaProfiles || []), normalized] }` sobre un
`Client` que no tiene ese campo en `types.ts`. Los otros dos sitios que lo leen
(`App.tsx:159`, `App.tsx:255`) esquivan el problema casteando a `any`.

**Escenario de falla:** benigno hoy — los perfiles de ADN viven en su propio estado
(`setDnaProfiles`) y nadie vuelve a leer `client.dnaProfiles` después del render inicial, así
que la escritura de la línea 872 es redundante. El costo es de mantenimiento: la API devuelve
un campo que el tipo niega, y el patrón de taparlo con `as any` es el mismo que produjo F4.

**Arreglo mínimo:** agregar `dnaProfiles?: ContentDNAProfile[]` a `Client` en `types.ts` y
sacar los tres `(c: any)`.

---

### F6 · BAJO — Restos de la auditoría y un runbook fantasma

- `CLAUDE.md:179` y `CLAUDE.md:197` referencian `docs/runbook-mejoras-h1.md` como la secuencia
  de despliegue del lote de costo/cuota/resiliencia/slot. **El archivo no existe.** `docs/`
  tiene `ROADMAP.md`, `plan-h1-multitenant-motor.md` y `runbook-tenancy.md`, nada más. El
  operador que siga `CLAUDE.md` para desplegar B0–B3 se queda sin instrucciones justo en los
  dos backfills que escriben datos.
- `server/.oraculo/repro.ts`, `repro2.ts`, `repro3.ts` — scratch de un agente previo, sin
  gitignorear y dentro del alcance del tsconfig raíz. Borrar, o agregar `.oraculo/` a
  `.gitignore`.

---

## Lo que no se pudo verificar sin base de datos

Ninguna de estas afirmaciones del plan pudo confirmarse en este entorno. Todas necesitan una
base alcanzable; ninguna es un hallazgo, son huecos de cobertura declarados.

| Qué queda sin verificar | Qué habría que correr |
|---|---|
| Aislamiento real entre tenants (criterio de aceptación de A0.1) | `npm run verify:isolation` con la API levantada y una base descartable. Es el único chequeo que ejercita las 28 guardas de `lib/tenancy.ts` de punta a punta. |
| Que las 3 migraciones nuevas apliquen en orden y que `_workspace_required` falle si quedan huérfanos | `prisma migrate deploy` sobre una copia del dump de producción, siguiendo `runbook-tenancy.md`. El SQL está escrito a mano (49 + 12 + 145 líneas) y **nunca se ejecutó**. |
| Que `schema.prisma` y los tres `migration.sql` describan el mismo esquema | `prisma migrate diff --from-migrations --to-schema-datamodel` — no toca la base de destino pero necesita un shadow database. |
| Los backfills de `backfill:tenancy`, `backfill:telemetria` y `backfill:slots` | Cada uno en dry-run primero (es el default) contra la copia del dump, comparando conteos antes/después. |
| Cuota por periodo: que un cliente al 100% vuelva a generar el día 1 del periodo siguiente (criterio B1) | Insertar un `UsagePeriod` vencido a mano y pedir una generación. No hay forma de simularlo sin base. |
| `GET /analytics/usage` devolviendo costo real por workspace (criterio B0) | Requiere `GenerationLog` con filas y las columnas nuevas pobladas. |

`npm run verify:resiliencia` sí es autocontenido (usa un cliente falso, no gasta crédito) y
**tampoco se corrió acá** — no necesita base y debería entrar al checklist previo al deploy.

---

## PROPUESTAS DE MEJORA

No repiten los hallazgos: son lo que el lote reveló sobre cómo está construido el sistema.

### P1 · Que la verificación verifique — **1 día** · Habilitador **E2**

**Problema que resuelve:** el repo tiene exactamente una gate de calidad y es decorativa para
la mitad del código. No es que falten tests: es que el chequeo que sí existe devuelve verde
sobre código que no leyó, y el proceso entero (`CLAUDE.md`, los criterios de aceptación de cada
ítem del plan, la definición de "listo" de cada agente que trabajó este lote) está construido
sobre ese verde. Un falso negativo en la única señal es peor que no tener señal, porque nadie
busca en otro lado.

Alcance: instalar los tipos de React; sacar `server/` del tsconfig raíz para que cada proyecto
se chequee con la config con la que se compila; un `tsconfig` que cubra `scripts/` y `prisma/`;
`strict: true` en el raíz como paso final con su propio presupuesto. Y actualizar
`CLAUDE.md:44-48`, que hoy documenta la gate con más confianza de la que se ganó.

Es el prerrequisito de todo lo demás de esta lista: sin esto, cualquier refactor grande es a
ciegas.

### P2 · CI que corra las dos gates y `verify:isolation` — **1–2 días** · Habilitador **E2**

**Problema que resuelve:** hoy la verificación depende de que un humano se acuerde de correr un
comando, y ese comando mentía. Este lote lo demuestra: tres agentes reportaron typecheck en
verde, y los tres tenían razón — el comando devolvía 0. El fallo no fue de disciplina, fue de
instrumento, y ningún grado de disciplina lo detecta.

Alcance: `.github/workflows/` con `npx tsc --noEmit` en raíz **y** en `server/`, `npm run
build`, `npm run verify:resiliencia` (autocontenido, sin crédito de API) y `verify:isolation`
contra un Postgres de servicio en el runner. Ese último cierra el hueco más caro de la tabla de
arriba: convierte el criterio de aceptación de A0.1 en algo que corre solo en cada push, en vez
de un runbook manual que nadie va a repetir en el lote seis.

Es la mitad de E2 que rinde antes: los tests unitarios de `validators.ts` y el eval harness
pueden esperar, esto no.

### P3 · Tipar el borde `services/api.ts` ↔ server — **2–3 días** · Habilitador **E2** (o nuevo, si se prefiere separado)

**Problema que resuelve:** `services/api.ts:4` declara
`export const apiRequest = async (endpoint: string, options: RequestInit = {})` — sin genérico
de retorno. **Todas** las llamadas del frontend devuelven `any`. F4 (un `WorkspaceMember[]`
guardado en un `User[]`) y F5 (`c.dnaProfiles` leído con `as any` en tres lugares) son el mismo
defecto asomando dos veces, y `App.tsx` tiene 13 `: any` explícitos, casi todos en normalizadores
de respuesta.

Esto importa más ahora que antes del lote: el lote acaba de meter la distinción
`User` / `WorkspaceMember` / `Membership`, que es *la* distinción de seguridad del modelo
multi-tenant (`CLAUDE.md:112-135`). Un borde sin tipos entre el frontend y esa distinción
significa que la UI puede mostrar el rol equivocado en la pantalla donde se otorgan permisos, y
nada lo va a marcar. Arreglar F4 tapa el síntoma de hoy; esto tapa la clase.

Alcance: `apiRequest<T>` con genérico; una firma de retorno por endpoint en `services/api.ts`;
mover a `shared/` los tipos de respuesta que hoy están duplicados entre `types.ts` y
`server/src/types.ts`, respetando que `shared/` no puede tener imports (`CLAUDE.md:154-155`).
Se paga solo cuando llegue el H2.A (Composición), que agrega tres destinos nuevos al mismo
borde.

### P4 · Los runbooks son parte del entregable — **0.5 día** · Habilitador **E2**

**Problema que resuelve:** `docs/runbook-mejoras-h1.md` está citado dos veces en `CLAUDE.md`
como la secuencia de despliegue de B0–B3 y no existe (F6). El lote produjo código verificable y
documentación no verificable, y la asimetría se nota en el peor momento: cuando alguien
despliega a las 11 de la noche. Un chequeo de enlaces rotos entre los `.md` de `docs/` y
`CLAUDE.md` en el mismo CI de P2 cuesta un paso de workflow.

### P5 · Instrumentar los backfills antes de correrlos — **1 día** · Habilitador **E4** (Observabilidad)

**Problema que resuelve:** hay cuatro scripts que van a escribir en la base de producción con
`--apply` y su única salida es `console.log`. `CLAUDE.md:176-179` los encadena en una secuencia
donde el orden importa y donde `_workspace_required` **falla a propósito** si el paso anterior
dejó huérfanos. Si eso pasa a mitad del despliegue, lo que el operador tiene para diagnosticar
es scrollback.

Alcance: que cada script emita un resumen estructurado (filas leídas, filas escritas, filas
salteadas y por qué) a un archivo, y que el dry-run imprima el mismo resumen que imprimiría el
`--apply`, para poder difear los dos. Es el primer pedazo concreto de E4 y tiene una fecha de
vencimiento: rinde solo si se hace **antes** del despliegue de este lote.

---

## Qué haría distinto la próxima vez

**1. Verificar el instrumento antes de confiar en la medición.** El error estructural de este
lote no fue de ningún agente en particular: fue que todos aceptaron `npx tsc --noEmit → 0` como
prueba de corrección sin preguntar nunca *qué archivos* estaba leyendo ese comando. Un
`--listFiles | wc -l` al empezar, o la sonda de tres errores deliberados de F1, cuesta dos
minutos y habría cambiado la definición de "listo" de todo el lote. En un repo sin tests, la
primera tarea de un lote es auditar la gate, no usarla.

**2. Las guardas de refutación necesitan hallazgos que refutar.** Este oráculo recibió
`hallazgos_sobrevivientes: []`, `refutados: 0` y `agentes_dijeron: null`. Un pipeline de
validación que entrega cero hallazgos sobre un lote de 50 archivos no está reportando un lote
limpio, está reportando que no corrió — y las dos cosas se ven idénticas desde acá. La
verificación independiente de este documento encontró seis hallazgos en menos de una hora, uno
de ellos crítico. El pipeline debería distinguir "revisé y no encontré nada" de "no revisé", y
tratar el segundo caso como una falla del workflow, no como un lote aprobado.

**3. Separar "el lote lo introdujo" de "el lote lo reveló".** F2 es un bug real de datos y es
preexistente (`git show HEAD:App.tsx:416` lo prueba). Sin ese chequeo de procedencia, el
veredicto habría bloqueado el despliegue por algo que ya está en producción hace meses, o —peor—
habría dado por buena la idea de que el lote lo rompió. Un `git diff` sobre las líneas exactas
de cada hallazgo debería ser parte de reportarlo, no un extra.

**4. Un lote que toca 50 archivos y 3 migraciones no cabe en una revisión.** A0, A0.6, A1, B0,
B1, B2 y B3 llegaron juntos al mismo veredicto. Los frentes A y B eran paralelos *en el plan*
(`plan-h1-multitenant-motor.md:270-281`) pero se fusionaron en un solo árbol sin desplegar, y
eso convirtió siete criterios de aceptación independientes en un único sí/no. La secuencia del
plan era correcta; lo que faltó fue un punto de corte —typecheck, revisión y veredicto— al
cerrar cada ítem, mientras el diff todavía se podía leer entero.

**5. Ningún ítem se declara hecho con su criterio de aceptación sin correr.** Cinco de los
siete criterios de este lote requieren una base de datos y ninguno se ejecutó. Eso es
aceptable, pero solo si el estado dice "implementado, criterio no verificado" en vez de
"implementado". Hoy `ROADMAP.md` dice "A0 y A1 implementados, sin desplegar", que es honesto
sobre el deploy y silencioso sobre la verificación.
