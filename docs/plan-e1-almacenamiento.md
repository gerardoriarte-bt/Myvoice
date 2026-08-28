# Plan E1 — Almacenamiento de archivos fuera del contenedor

> ✅ **Desplegado el 2026-08-28.** Bucket `myvoice-bucket-151241089385-us-east-1-an` en us-east-1,
> rol de instancia `myvoice-rol`. Verificado en producción: escritura OK, lectura firmada 200,
> **lectura sin firma 403**, borrado OK, `/uploads` devuelve 404 y los 53 MB de archivos huérfanos
> quedaron eliminados. Falta solo la regla de ciclo de vida de `piezas/`, que recién hace falta
> con la fase H2.
>
> Habilitador. No cambia nada de lo que el usuario ve, y es **prerrequisito duro** de la
> [fase H2](./plan-h2-produccion-auditoria.md): sin esto, la subida de piezas de diseño repite un
> incidente conocido.

## Por qué, y por qué ahora

Hoy los archivos se escriben en el disco del contenedor:

```
clientController.ts:225 → await fs.writeFile(path.join(UPLOAD_DIR, safeName), req.file.buffer)
index.ts:56            → app.use('/uploads', express.static(...))
```

Tres problemas, en orden de gravedad:

**1 · Los archivos son públicos.** El `express.static` está montado antes de las rutas y **fuera
de toda autenticación**. Cualquiera con la URL descarga el PDF de guía de marca de cualquier
empresa: sin sesión, sin chequeo de workspace, sin vencimiento y sin forma de revocar. El nombre
—`<clientId>-<timestamp>.pdf`— no se adivina, pero una URL filtrada vale para siempre.

Es el único lugar del producto donde el aislamiento multi-tenant que se desplegó hoy **no
aplica**: `lib/tenancy.ts` protege los endpoints, no los archivos estáticos.

**2 · Se pierden al recrear el contenedor.** Viven en un volumen Docker. Sobreviven a un
`restart`, no a un `docker volume rm` ni a mover el servicio de máquina.

**3 · Llenan el disco.** Ya hubo un outage por disco lleno (documentado en
`aws_deployment_plan.md`). Hoy son 5 archivos y 53 MB con el disco al 24%: no urge por espacio.
Con las piezas de diseño del H2 —varias por campaña, órdenes de magnitud más pesadas— sí.

## Qué se construye

**Una abstracción de almacenamiento con dos drivers**, elegidos por entorno, con el mismo
criterio que `aiClient` usa para los cuatro proveedores de IA: el call site no sabe cuál está
activo.

| Driver | Cuándo | Para qué |
|---|---|---|
| `local` | sin configuración de S3 | desarrollo, y el estado actual sin cambios |
| `s3` | con bucket configurado | producción |

**Sin S3 configurado, todo sigue funcionando como hoy.** Es lo que evita romper el desarrollo
local y lo que permite desplegar el código antes de crear el bucket.

## Decisiones

**D1 · ¿Bucket público o URLs firmadas?**
Firmadas, con vencimiento corto. El bucket no expone nada. Un endpoint autenticado —que pasa por
`assertClientInWorkspace`, igual que el resto— genera la URL en el momento. Esto **cierra el
agujero 1**, que hoy existe aunque el archivo esté en disco local.

**D2 · ¿Credenciales o rol de instancia?**
Rol de IAM en la EC2. No hay llaves que rotar ni que puedan filtrarse en un dump. El SDK las toma
del entorno solo.

**D3 · ¿Qué pasa con los 5 archivos que ya existen?**
Un script de migración, con el mismo contrato que los backfills: dry-run por defecto, `--apply`
para escribir, resumen estructurado. Sube cada archivo y reescribe `brandGuidelinePdfUrl`. Los
archivos viejos no se borran del disco hasta confirmar que los nuevos se leen.

**D4 · ¿Se cambia la forma de la URL guardada en la base?**
Sí, y es lo que obliga al script: hoy se guarda `/uploads/<archivo>`, una ruta. Pasa a guardarse
la **clave del objeto**, y la URL se genera al leer. Una URL firmada tiene vencimiento; guardarla
sería guardar algo que caduca.

**D5 · ¿Se descarta el PDF después de extraer el ADN?**
El motor no lo vuelve a leer nunca: la extracción corre una vez y deja campos estructurados.
Descartarlo sería más simple. *Decisión: no se descarta*, por tres cosas que se pierden y que ya
están comprometidas — volver a extraer con un prompt o un modelo mejor (hoy el corte son 18.000
caracteres), la recuperación sobre el manual completo (H2.D), y la auditoría de la fase H2 contra
el manual entero en vez de contra la lista corta de prohibiciones. Además es una función del
producto: `ClientManager.tsx:681` muestra el enlace a la guía.

Lo que sí se corrige es la acumulación real, que **no es un PDF por marca sino todas las
versiones que alguna vez se subieron**: cada resubida creaba un objeto nuevo y dejaba el anterior
huérfano para siempre. Ahora se borra el anterior al subir el nuevo. Una marca, un archivo: con
100 marcas es ~1 GB estable, dos centavos de dólar al mes, que no crece.

### Lo que va a guardar, más allá de las guías

El bucket es también donde van a vivir **las piezas de diseño** de la
[fase H2](./plan-h2-produccion-auditoria.md), con prefijo `piezas/`. Esa es la razón por la que
E1 es prerrequisito y no una mejora: un PDF de 10 MB por marca el disco lo aguanta; varias piezas
por campaña, no.

Y con una regla distinta a la de las guías: las versiones de una pieza **se conservan a
propósito**, porque el informe de auditoría compara la devuelta con la corregida. Cuánto tiempo,
es la decisión D6 de esa fase.

## Fases

**1 · La abstracción y el driver local.** `lib/storage.ts` con `put`, `getUrl` y `delete`. El
driver local hace exactamente lo que hoy hace `clientController`. Sin cambio de comportamiento:
es refactor puro y se puede verificar con la app corriendo igual que siempre.

**2 · El driver S3 y la URL firmada.** Con el endpoint autenticado que la genera. Acá se cierra
el agujero de los archivos públicos, y `express.static` desaparece.

**3 · La migración de los 5 archivos.** Dry-run, revisión, apply.

**4 · Retirar el disco.** Sacar el volumen del compose una vez confirmado que nada lo lee.

## Lo que hace falta de tu lado: el bucket y el rol

Verificado el 2026-08-28 contra la instancia: está en **us-east-1** y **no tiene rol de IAM
asignado**. Hay que crear los dos.

### El bucket

| Ajuste | Valor | Por qué |
|---|---|---|
| Región | **us-east-1** | La misma que la EC2. Cruzar región cuesta transferencia y suma latencia a cada firma |
| Block Public Access | **las cuatro opciones activadas** | El bucket no expone nada. Todo acceso pasa por una URL firmada que vence, y esa firma solo la emite alguien que pasó `assertClientInWorkspace` |
| Cifrado | **SSE-S3** (el default) | Suficiente y sin costo. SSE-KMS agrega precio por llamada y una llave más que administrar |
| Versionado de S3 | **desactivado** | Las versiones las maneja la aplicación con la clave del objeto. El versionado de S3 guardaría además cada sobrescritura para siempre — justo la acumulación silenciosa que E1 viene a evitar |
| CORS | **no hace falta** | El navegador abre la URL firmada como enlace o `<img>`, no por `fetch`. Si algún día una pieza se dibuja en un canvas, ahí sí |

Un solo bucket, con prefijos: `guias/` para los PDF de marca, `piezas/` para los diseños.

### El rol de IAM

Un rol para la instancia EC2 —no un usuario con llaves— con esta política, acotada a este bucket
y a nada más. Sin llaves que rotar ni que puedan aparecer en un dump: la lección que dejó
`Workspace.aiApiKey`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::NOMBRE-DEL-BUCKET/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::NOMBRE-DEL-BUCKET"
    }
  ]
}
```

### Regla de ciclo de vida

Una sola, y recién hace falta con la fase H2:

- Prefijo `piezas/originales/` → **expirar a los 90 días**.

Es la mitad automática de la decisión D6 de esa fase: el archivo pesado se va solo, la evidencia
liviana se queda. Las guías (`guias/`) no llevan regla: son una por marca y no crecen.

### Después de crearlo

```bash
# en server/.env.production
S3_BUCKET=nombre-del-bucket
AWS_REGION=us-east-1
```

Desplegar, verificar en los logs la línea `[storage] driver s3`, y correr
`npm run migrar:archivos` (dry-run primero) para los 5 archivos históricos.

## Criterio de salida

Un PDF subido desde la app se guarda en S3, se lee por URL firmada que vence, y **la misma URL
pedida por un usuario de otro workspace devuelve 404**. Los 5 archivos históricos migrados y
legibles. El volumen del contenedor sin uso.
