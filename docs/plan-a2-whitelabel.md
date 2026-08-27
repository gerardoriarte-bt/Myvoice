# Plan A2 — White-label por workspace

> Último ítem del [H1](./ROADMAP.md). Cierra el criterio de salida: dar de alta un tenant nuevo
> sin tocar código incluye que ese tenant no vea la marca de otro.
>
> **El plan tiene dos niveles y se ejecutan en orden.** El nivel 1 es diseño y no toca código:
> se valida la experiencia en `design/MyVoice_Engine.pen` mientras el lote H1 espera despliegue.
> El nivel 2 es la implementación, y arranca con las decisiones del nivel 1 ya tomadas.

---

## Qué hay hoy

Inventario verificado sobre el árbol, no de memoria:

| Dónde | Qué | Archivo |
|---|---|---|
| App interna | Logo `/LobuenoLogo.png` hardcodeado en tres pantallas | `App.tsx:702`, `Login.tsx:137`, `HomePage.tsx:357` |
| Emails | Cabecera fija "My Voice / Motor de Copy · Vive Terpel" | `notificationService.ts:39-41` |
| Bundle | `MOCK_CLIENTS` con seis marcas reales (Terpel, Huggies, Club Colombia, Bimbo, Volkswagen) viaja en el JavaScript de producción | `App.tsx:28-34` |
| Portal de revisión | **Sin identidad de ninguna clase**: solo el título de la sesión | `ReviewPortal.tsx:154-160` |
| Marca (`Client`) | Ya tiene `logo` en base64, y se usa en cuatro pantallas internas | `types.ts`, `BrandHubHero.tsx:27` |
| Workspace | No tiene ningún campo de identidad visual | `schema.prisma` |

Dos cosas que conviene separar, porque tienen dueños distintos:

- **La app interna** la ve el equipo del workspace. Acá "white-label" significa que la empresa
  vea su marca, no la de la agencia que le vendió la herramienta.
- **El portal de revisión** lo ve el cliente final del cliente: alguien que no tiene cuenta,
  que entra por un token y que probablemente no sabe qué es My Voice. Es la pantalla con más
  superficie de marca del producto y hoy es la única que no tiene ninguna.

El mock del bundle es aparte y es un problema hoy, no de A2: un producto multi-tenant no puede
embarcar los nombres de los clientes de un tenant en el JavaScript que descarga otro.

---

# Nivel 1 · Diseño y validación de experiencia

**Entregable:** `design/MyVoice_Engine.pen`. **No se escribe código en este nivel.**

De acá en adelante, todo avance, mejora o funcionalidad nueva se diseña primero en ese archivo.
Los planes técnicos y runbooks siguen viviendo en `docs/`; el `.pen` es dónde se decide qué ve
el usuario y los `.md` son dónde se decide cómo se construye.

## Pantallas a diseñar

1. **Configuración → Identidad del workspace.** Subir logo, elegir color, nombre visible.
   Con vista previa en vivo: el que configura tiene que ver el resultado sin guardar.
2. **App interna con la identidad aplicada.** Dos variantes lado a lado, con marcas distintas,
   para ver que el layout aguanta las dos.
3. **Portal de revisión con identidad.** La pantalla que ve el cliente final. Es la que más
   importa de las seis.
4. **Email de invitación con identidad.** Hoy la cabecera es fija.
5. **Selector de workspace.** El admin de agencia con membresía en varias empresas necesita
   distinguirlas de un vistazo; hoy es una lista de nombres.
6. **Estado vacío.** Un workspace recién creado, sin logo ni color. Es el estado de todos los
   tenants el día del despliegue, así que no puede verse como un error.

## Decisiones a validar

Cada una cambia la implementación. Van con recomendación, no para cerrarlas de antemano sino
para que el diseño tenga de dónde partir.

**D1 · ¿De quién es la marca del portal de revisión: del workspace o de la marca?**
Es la decisión más cara de revertir. El plan original decía "hereda el branding del workspace",
pero `Client` ya tiene `logo` y quien revisa es el cliente **de esa marca**, no de la empresa
que la gestiona. Si una agencia gestiona Terpel y Huggies, el revisor de Huggies debería ver
Huggies. *Recomendación:* manda la marca; el workspace es el fallback cuando la marca no tiene
logo. Diseñar las dos y mirarlas.

**D2 · ¿Un color o una paleta?**
Un solo `primaryColor` es lo que un cliente puede elegir sin equivocarse; una paleta completa
garantiza que alguien elija gris sobre gris. *Recomendación:* un color, con el resto derivado y
el contraste del texto calculado automáticamente. El diseño tiene que incluir **el caso feo**:
qué pasa cuando el tenant elige un amarillo casi blanco.

**D3 · ¿Qué se muestra sin logo?**
*Recomendación:* iniciales sobre el color del workspace, como ya hace `ClientManager.tsx:497`
con las marcas. Reusar ese patrón en vez de inventar otro.

**D4 · ¿La identidad llega al Excel exportado?**
El `.xlsx` de `ResultsTable` es lo que más circula fuera de la herramienta: se manda por mail,
se comparte con terceros. Es barato de marcar y es la pieza que más lejos viaja.
*Recomendación:* sí, al menos el nombre visible en la cabecera.

**D5 · ¿Cuánto se puede personalizar sin romper la app?**
Logo, color y nombre alcanzan. Tipografías y CSS libre no: garantizan un ticket de soporte por
tenant. Vale la pena que el diseño deje explícito dónde está el límite.

## Estados límite que el diseño tiene que cubrir

No son casos raros: son los que aparecen el primer día.

- Logo horizontal muy ancho (una firma) contra logo cuadrado (un isotipo). El contenedor tiene
  que aguantar los dos sin deformar.
- Logo PNG con fondo transparente sobre cabecera oscura, que es donde desaparece.
- Nombre visible largo, del tipo "Dirección de Marca y Comunicaciones".
- Color de contraste insuficiente.
- Workspace sin nada configurado.

## Criterio de "diseño listo"

Las seis pantallas en el `.pen`, las cinco decisiones resueltas con una nota que diga qué se
eligió y por qué, y los cinco estados límite dibujados. Sin eso, el nivel 2 arranca adivinando.

---

# Nivel 2 · Implementación

Estimado: **2 días**, con las decisiones del nivel 1 cerradas. Arranca después del despliegue
del lote H1.

## Fase 1 — Datos

Migración aditiva sobre `Workspace`: `logoUrl`, `primaryColor`, `displayName`. Los tres
nullable: un workspace sin identidad configurada es un estado válido y permanente, no una fila
a medio llenar.

`primaryColor` se valida en el servidor contra `^#[0-9a-fA-F]{6}$`. Es un valor que termina
inyectado en un `style` de una página pública sin login: cualquier cosa que no sea un hex de
seis dígitos se rechaza en el borde, no se sanea después.

## Fase 2 — Backend

- `GET`/`PUT /workspace/branding`, detrás de `requireManager`. Los campos entran por una
  allow-list, como el resto de los updates del proyecto.
- El logo sigue el camino de subida que ya existe (`multer` → disco del contenedor). **Esto
  agrega presión al problema de E1**: ya hubo un outage por disco lleno y esto suma un archivo
  por tenant. Si E1 (migrar a S3) se hace antes, A2 nace apoyado ahí; si no, queda anotado.
- `GET /review/public/:token` devuelve la identidad **resuelta en el servidor** según D1. El
  portal no puede pedir el branding por su cuenta: no tiene sesión, y un endpoint público que
  acepte un `workspaceId` es un enumerador de tenants.
- `notificationService` toma la cabecera del workspace, con el texto actual como fallback.

## Fase 3 — Frontend interno

- Los tres `/LobuenoLogo.png` salen y pasan a leer del workspace activo, con el estado vacío
  de D3.
- Pantalla de configuración de identidad con la vista previa del nivel 1.
- El color se aplica como variable CSS en la raíz, no repartido por componente.
- `MOCK_CLIENTS` sale del bundle de producción y queda detrás de un flag de demo. Es
  independiente del resto y se puede hacer primero.

## Fase 4 — Portal de revisión y email

El portal es el entregable real de A2 y va último a propósito: es el que más depende de que D1
esté resuelta.

## Criterio de aceptación

Dos workspaces con logos y colores distintos; el portal de revisión de cada uno muestra el
suyo, y el `.xlsx` exportado también si D4 quedó en sí. Un workspace sin identidad configurada
se ve deliberado, no roto. Y el bundle de producción no contiene el nombre de ningún cliente.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Un color de bajo contraste vuelve ilegible el portal público — y lo ve el cliente del cliente, no el que eligió el color | Contraste calculado, no elegido. Validado en el diseño antes de codificarlo |
| `primaryColor` termina en el `style` de una página sin auth | Validación estricta de hex en el servidor, en el `PUT` |
| Un logo por tenant en el disco del contenedor | Ver E1. Anotar el tamaño máximo y vigilarlo |
| El portal filtra a qué workspace pertenece una sesión | La identidad la resuelve el servidor desde el token; el cliente nunca pregunta por un tenant |
