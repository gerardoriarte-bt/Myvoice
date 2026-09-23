# Plan H3.D — funciones del equipo y notificaciones

> Quién escribe, quién diseña y quién aprueba, y que a cada uno le llegue lo que le toca.
> Estado: **nivel 1 dibujado** el 2026-09-23, en `§ H3.D · …` del `.pen`. Listo para construir.

## El hueco

Hoy el equipo tiene tres roles —`OWNER`, `ADMIN`, `MEMBER`— y los tres dicen **cuánto puede
administrar** una persona, no **qué hace**. El tablero de producción asigna a personas, no a
funciones, así que no hay forma de saber quién es diseñador y quién aprueba.

Y las notificaciones están peor de lo que parece. Existe una sola —revisión completada
(`notificationService.ts`)— y **se manda a una casilla fija**, `RESEND_TO_EMAIL`, definida en el
entorno del servidor. No le llega a la persona que tiene que actuar: le llega a una dirección. Con
una segunda empresa en el producto, sus avisos caen en la misma casilla.

## Decisiones

**D1 · Permiso y función son dos ejes, y no se mezclan — DECIDIDA.**
`Membership.role` se queda como está. La función es un eje nuevo, y una persona puede tener
varias: en un equipo chico la misma persona escribe y aprueba.

Mezclarlos en una sola lista de roles parece más simple hasta el primer caso real —«un ADMIN que
además diseña»— y ahí hay que rehacerlo.

**D2 · La función sugiere, no restringe — DECIDIDA.**
Ser aprobador no es requisito para aceptar una pieza: es lo que hace que te avise y que aparezcas
primero en las listas. Si restringiera, el día que el aprobador está de vacaciones habría que ir a
Equipo a cambiar roles para destrabar una pieza — y eso termina con todos siendo aprobadores «por
las dudas», que es peor que no tener funciones.

Es el mismo criterio que D2 de la auditoría: **un automatismo tiene que ganarse la autoridad con
historial**. Cuando haya meses de uso se verá si alguna función merece volverse requisito.

**D3 · La función se puede acotar a marcas — DECIDIDA.**
La visibilidad no cambia: todos los miembros siguen viendo todas las marcas del workspace. Lo que
la marca acota es **a quién le llega el aviso**. Con tres marcas y seis aprobadores, avisarles a
todos por cada entrega es exactamente el ruido que esto viene a evitar.

| Fila | Significa |
|---|---|
| Luis · Diseño · *(sin marca)* | Diseña para todas las marcas del workspace |
| Ana · Aprobación · Vive Terpel | Aprueba las piezas de Terpel |
| Ana · Copy · Huggies | Y además escribe para Huggies |

**D4 · Solo dos eventos notifican, y por los dos canales — DECIDIDA.**

| Evento | A quién | Por qué ese y no otro |
|---|---|---|
| **Asignación** | A la persona asignada | Es la única que puede destrabarlo |
| **Entrega** | A los aprobadores de esa marca | La pieza quedó esperando una decisión |

Y tres reglas contra el ruido, que valen más que la lista de eventos:

1. **A nadie por su propia acción.** Quien se autoasigna una pieza no recibe un correo avisándole.
2. **Un lote es un aviso.** Asignar cinco piezas de una campaña manda un correo, no cinco.
3. **Sin recordatorios.** Si nadie actúa, el tablero ya lo muestra; insistir por correo es lo que
   hace que el equipo filtre los correos de la herramienta — y ahí se pierden también los dos que
   importan.

Canales: **bandeja dentro de la herramienta** (no molesta, queda) y **email** (saca a alguien de
su día). Los dos llevan el mismo contenido y un enlace directo a la pieza.

**D5 · Dominios: no se reabre el alta automática — DECIDIDA.**

Hay que separar dos cosas que se llaman igual:

- **Alta por dominio** —cualquiera con un email `@empresa.com` entra y se le crea el usuario— es
  justo lo que el H1 eliminó, junto con el password maestro
  ([runbook](./runbook-tenancy.md)). **No se reabre.** La pertenencia se demuestra con una fila
  de `Membership`, no con la forma del email.
- **Lista de dominios permitidos para invitar**, opcional y por workspace, sí aporta: evita
  mandarle una invitación a un Gmail personal por un dedazo, que en una herramienta donde el
  invitado ve todas las marcas del workspace no es un error menor. Por defecto apagada; cuando
  está encendida, invitar fuera de la lista se bloquea con un mensaje que dice qué dominios
  acepta ese workspace.

**Y la parte de seguridad que sí urge es la del remitente.** Los correos salen desde
`noreply@myvoice.lobueno.co`: ese dominio tiene que estar verificado en Resend con SPF, DKIM y un
DMARC en `quarantine`. Sin eso, cualquiera puede mandar correos que digan venir de My Voice, y los
nuestros van a spam. Es más urgente que la lista de dominios, porque afecta a los avisos que este
plan agrega.

---

# Nivel 1 · Diseño — dibujado

Cuatro pantallas y cuatro estados límite, en `§ H3.D · Equipo con funciones`,
`§ H3.D · Asignar funciones`, `§ H3.D · La bandeja`, `§ H3.D · El email` y
`§ H3.D · Estados límite`.

## Lo que resolvió el dibujo

**El rol y la función tienen que verse distinto en la misma fila.** Si se leyeran igual, el
primero que vea «ADMIN» y «Aprobación» juntos va a pensar que uno reemplaza al otro. En la fila
del equipo el rol va en negro a la izquierda, después una línea fina, y después las funciones en
el color de su etapa del producto: azul el copy, violeta el diseño, ámbar la aprobación. **La
línea fina hace más por explicar los dos ejes que cualquier texto de ayuda.**

**«Todas las marcas» es el estado por defecto.** Acotar por marca es la excepción, y dejarlo fácil
de no tocar evita que alguien se quede sin avisos por haber elegido de más.

**La bandeja vacía es la pantalla habitual**, no un caso raro: un equipo al día no tiene avisos.
Por eso no dice «no hay nada» — dice dónde mirar, con un botón a Producción.

**Cada correo dice al pie por qué llegó y dónde se cambia.** Sin esa línea, el primer impulso de
quien no quiere el aviso es marcarlo como spam, y ahí se pierden también los que sí importan.

## Los cuatro estados límite

1. **Un workspace sin ninguna función asignada.** Es el estado de todos el día del despliegue. La
   regla: sin aprobadores declarados para esa marca, la entrega avisa a quienes administran el
   workspace. **Nunca se cae en «no avisar a nadie»: se avisa más arriba.**
2. **Tres funciones en cinco marcas.** La fila muestra funciones, no marcas —«Copy · 2 marcas»—, y
   el detalle vive en la ficha de la persona, que es donde se edita.
3. **La misma persona asigna y recibe.** Del destinatario siempre se quita al autor; si queda
   vacío, no se manda nada, ni correo ni aviso.
4. **Resend sin configurar.** El aviso se guarda igual en la bandeja; el correo es un canal
   adicional. Y el envío fallido queda en el log, no se reintenta en silencio.

---

# Nivel 2 · Cómo se construye

## Modelo

```prisma
enum FuncionEquipo { COPY  DISENO  APROBACION }

/// Qué hace una persona, distinto de cuánto puede administrar (D1).
/// `clientId` NULL = todas las marcas del workspace (D3).
model MiembroFuncion {
  id          String        @id @default(uuid())
  workspaceId String
  userId      String
  funcion     FuncionEquipo
  clientId    String?
  createdAt   DateTime      @default(now())

  @@unique([workspaceId, userId, funcion, clientId])
  @@index([workspaceId, funcion])
}

/// La bandeja. Append-only: una notificación leída no se borra, se marca.
model Notificacion {
  id          String    @id @default(uuid())
  workspaceId String
  userId      String
  tipo        String    // ASIGNACION · ENTREGA
  piezaId     String?
  /// Cuántas piezas agrupa, para el lote de D4 regla 2.
  cantidad    Int       @default(1)
  titulo      String
  detalle     String?
  leidaAt     DateTime?
  createdAt   DateTime  @default(now())

  @@index([userId, leidaAt, createdAt])
}
```

`@@unique` con `clientId` nullable deja convivir «Ana aprueba Terpel» con «Ana aprueba todo», y en
Postgres dos NULL no chocan: la fila «todas las marcas» es única por función.

## Enrutamiento

Una sola función, `destinatariosDe(evento)`, y nadie más resuelve destinatarios:

- **Asignación** → el `asignadaAId` de la pieza. No depende de funciones.
- **Entrega** → quienes tengan `APROBACION` con `clientId` de esa marca **o** sin marca. Si no hay
  ninguno, los que administran el workspace (estado límite 1).
- **Siempre** se quita al autor del evento (D4 regla 1).

## El arreglo del destinatario fijo

`notificationService.ts` pasa a recibir **destinatarios**, no a leerlos del entorno.
`RESEND_TO_EMAIL` se elimina; `RESEND_FROM_EMAIL` se queda. La notificación de revisión
completada, que hoy va a esa casilla, pasa a ir a quien creó la sesión.

Es un arreglo de aislamiento, no una mejora: hoy los avisos de una empresa llegan a una dirección
del operador del producto.

## Fases

1. **Funciones** — modelo, endpoints y la pantalla de Equipo. Entrega valor sola: aunque no
   notifique nada, el «Asignar a…» del tablero ya puede ordenar primero a los diseñadores.
   **Construida** el 2026-09-23: `MiembroFuncion`, `services/funcionesService.ts`, los dos
   endpoints bajo `/workspace/members/:userId/funciones`, `components/FuncionesDelMiembro.tsx`
   y `components/produccion/asignables.ts`. `verify:isolation` pasa a 56 casos con seis de
   funciones. Lo único de la fase que quedó fuera es el estado límite 2 —«Copy · 2 marcas»
   plegado cuando son muchas—: con tres marcas la fila entra entera, y plegarla antes de que
   moleste es adivinar dónde molesta.
2. **Bandeja** — el modelo de notificación, la campana y la lista. Sin email todavía.
   **Construida** el 2026-09-23: `Notificacion`, `services/notificacionService.ts` con
   `destinatariosDe()`, las tres rutas bajo `/notificaciones` y `components/Bandeja.tsx`.
   `verify:isolation` pasa a 66 casos con diez de bandeja.

   Dos cosas que el nivel 2 no había previsto y el código obligó a decidir:

   - **La agrupación del lote no es transaccional, es por ventana.** No hay endpoint que
     asigne cinco piezas de una vez: el tablero asigna de a una. Así que el aviso no se arma
     del lote, sino al revés — un aviso **sin leer** de la misma persona, tipo y marca sigue
     abierto diez minutos y absorbe la pieza siguiente. En cuanto alguien lo leyó, ya cumplió
     y el próximo empieza de cero.
   - **`Notificacion` lleva `clientId`.** Es lo que hace que el lote agrupe por marca: sin esa
     columna, dos campañas de marcas distintas repartidas la misma tarde caen en un mismo
     «te asignaron 5 piezas» que ya no dice de qué. Y cuando el aviso agrupa más de una,
     `piezaId` pasa a NULL: el destino de un lote es el tablero de la marca, no una tarjeta.
3. **Email** — el envío por Resend con los destinatarios reales, y el arreglo del destinatario fijo.
   **Construida** el 2026-09-23. `notificationService.ts` pasó a tener **un solo punto de
   envío** (`enviar`), que recibe destinatarios y no los lee del entorno; los tres correos
   —invitación, revisión completada y aviso de pieza— comparten un molde.

   - **`RESEND_TO_EMAIL` ya no existe.** La revisión completada va a quien creó la sesión.
     El compilador encontró el único punto que faltaba pasar: el tipo lo exige.
   - **Solo sale correo del aviso nuevo.** El que absorbió una pieza más ya tiene el suyo en
     camino. El precio: un correo puede decir «una pieza» cuando la bandeja ya muestra cinco.
     Es a propósito — el correo es el empujón, la herramienta es el registro, y el enlace
     lleva a las cinco.
   - **El enlace aterriza en la pieza**, no en la portada: `/?pieza=<id>&marca=<clientId>`,
     que `App.tsx` lee al montar y después limpia de la URL para que un F5 no reabra la pieza
     de un correo viejo.
   - El envío va **después** de la transacción y en segundo plano. Adentro, un 409 de la
     guarda de concurrencia dejaría correos anunciando algo que nunca pasó.

   **Lo que el despliegue tiene que hacer**, y no está en el código:

   1. Verificar el dominio de `RESEND_FROM_EMAIL` en Resend con SPF, DKIM y un DMARC en
      `quarantine`. Sin eso los correos van a spam y cualquiera puede mandar correos que
      digan venir de My Voice. **Esto va antes de desplegar**, no después.
   2. Quitar `RESEND_TO_EMAIL` del `.env` del servidor. Ya no se lee; dejarla solo confunde
      al próximo que abra el archivo. (`server/.env.example` no está versionado —lo tapa
      `.env.*` en `.gitignore`—, así que el cambio hay que hacerlo también en la máquina de
      quien despliegue.)
   3. Confirmar `APP_URL`: es la que arma los enlaces de los correos.
4. **Dominios permitidos** — la lista opcional por workspace, solo sobre invitaciones.
   **Construida** el 2026-09-23: `Workspace.dominiosPermitidos String[]`, `lib/dominios.ts`,
   `GET/PUT /workspace/dominios` y `components/DominiosPermitidos.tsx`. `verify:isolation`
   queda en **73 casos**.

   - **Vacía = apagada, y no hay bandera aparte.** Una lista vacía ya dice exactamente eso;
     dos formas de apagar lo mismo terminan discrepando.
   - **La comparación es exacta, no por sufijo.** `empresa.com` no habilita
     `mail.empresa.com`. Un sufijo parece más cómodo hasta que alguien registra
     `no-empresa.com`, y sobre todo: una regla que se lee de un vistazo es la que se entiende
     al ver el rechazo.
   - **La guarda va antes de las dos ramas de `createInvite`.** La del usuario que ya existe
     da membresía en el acto, sin invitación de por medio — es la que más había que cuidar, y
     la que se habría pasado por alto poniendo el control junto al envío del correo.
   - **El panel vive debajo del formulario de invitar**, no en Configuración: es una regla
     sobre esa acción, y el momento en que a alguien se le ocurre acotarla es justo cuando
     está invitando.
   - Lo que no es un dominio se descarta en vez de rechazar la lista entera: quien escribe
     cinco a mano no tiene por qué perder los cuatro buenos por una coma de más.

## Criterio de aceptación

- Un miembro con función Diseño aparece primero en «Asignar a…», y uno sin función **igual
  aparece** (D2: sugiere, no restringe).
- Asignar cinco piezas de una vez genera **una** notificación con `cantidad = 5`.
- Quien se autoasigna una pieza no recibe nada.
- Entregar una pieza de Terpel notifica a los aprobadores de Terpel y **no** a los de Huggies.
- Un workspace sin funciones declaradas: la entrega notifica a quienes administran.
- Sin `RESEND_API_KEY` la notificación se guarda igual y solo no sale el correo.
- `verify:isolation` suma el caso: un miembro de otro workspace **no** recibe notificaciones ni
  puede leer la bandeja ajena.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El equipo filtra los correos de la herramienta | Solo dos eventos, sin recordatorios, y un correo por lote (D4) |
| Las funciones quedan sin llenar y nada notifica | El estado límite 1: sin aprobadores declarados, avisa a quien administra |
| Alguien pide que la función restrinja | D2 lo deja escrito: se revisa con meses de uso, no antes |
| Los correos caen en spam | Verificar el dominio en Resend con SPF, DKIM y DMARC **antes** de la fase 3 |
