# Plan H3.D — funciones del equipo y notificaciones

> Quién escribe, quién diseña y quién aprueba, y que a cada uno le llegue lo que le toca.
> Estado: **plan escrito, sin dibujar.** El nivel 1 espera al `.pen`.

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

# Nivel 1 · Diseño

**Entregable:** `design/MyVoice_Engine.pen`. Cuatro pantallas y dos estados límite.

## Pantallas a dibujar

1. **Equipo, con funciones.** La lista de miembros hoy muestra rol y poco más. Tiene que mostrar
   **rol y funciones en la misma fila**, sin que se lean como lo mismo — es el punto donde se
   entiende, o no, que son dos ejes.
2. **Asignar funciones a una persona**, incluyendo el caso de acotar por marca. El estado más
   común es «todas las marcas», y tiene que ser el más fácil de dejar así.
3. **La bandeja.** Qué se ve cuando hay avisos sin leer y qué cuando no hay ninguno. El estado
   vacío importa: va a ser el habitual.
4. **El email**, en sus dos formas: te asignaron una pieza, y hay una pieza esperando tu revisión.

## Estados límite

- Un workspace **sin ninguna función asignada** — el estado de todos el día del despliegue. Nadie
  puede quedarse sin avisos por eso: si no hay aprobadores declarados para la marca, la entrega
  avisa a todos los que administran.
- Una persona con **tres funciones en cinco marcas**: la fila del equipo tiene que seguir
  leyéndose.
- La misma persona **asigna y recibe**: no le llega nada, y la bandeja no muestra su propia acción.
- **Resend sin configurar**: el aviso interno igual se guarda; solo no sale el correo.

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
2. **Bandeja** — el modelo de notificación, la campana y la lista. Sin email todavía.
3. **Email** — el envío por Resend con los destinatarios reales, y el arreglo del destinatario fijo.
4. **Dominios permitidos** — la lista opcional por workspace, solo sobre invitaciones.

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
