# Despliegue H2 — la hoja del día

> El tablero de producción y la auditoría de piezas, en producción. Mucho más simple que el H1:
> las dos migraciones son **puramente aditivas** y no hay backfill, así que no existe el paso que
> falla a propósito. La complejidad se corrió de la base al bucket y al gasto de IA.
>
> Detalle: [plan de la fase](./plan-h2-produccion-auditoria.md) · [almacenamiento](./plan-e1-almacenamiento.md)

## Qué se despliega

| | Qué cambia | Riesgo si sale mal |
|---|---|---|
| **Fase 2** | La pantalla Producción, el tablero, la orden de trabajo y el alta de piezas | Una pantalla nueva no anda. Nada del flujo existente depende de ella |
| **Fase 3** | Subida del archivo, snapshot con `sharp` y la verificación con IA | El bucket crece sin control, o la auditoría gasta más de lo previsto |
| **Nav** | Cinco etapas: el copy se **escribe**, la pieza se **produce** | Cosmético, pero lo ve todo el equipo el primer día |

Lo que **no** entra: la fase 4 —la pieza vuelve al cliente— y
[E6](./plan-e6-registro-consumo.md). Si aparecen acá, algo se mezcló.

## ⚠️ Lo primero: la regla del bucket, antes del deploy

`piezas/originales/` empieza a llenarse con **la primera pieza que alguien suba**. La regla que
los borra a los 90 días (D6) no es urgente por espacio —son 10 MB por pieza— sino porque después
hay que aplicarla sobre objetos que ya existen y nadie se acuerda de cuáles eran. Se crea antes,
sobre un prefijo vacío, y queda funcionando sola:

```bash
aws s3api put-bucket-lifecycle-configuration --bucket "$S3_BUCKET" \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "piezas-originales-90-dias",
      "Status": "Enabled",
      "Filter": { "Prefix": "piezas/originales/" },
      "Expiration": { "Days": 90 }
    }]
  }'

# Verificar que quedó, y que NO toca piezas/snapshots/ ni las guías de marca:
aws s3api get-bucket-lifecycle-configuration --bucket "$S3_BUCKET"
```

**El prefijo importa.** `piezas/` a secas borraría también los snapshots, que son permanentes y
son la única evidencia de qué se aprobó una vez que el original se va.

## Antes de empezar

- [ ] **`pg_dump`.** Las migraciones son aditivas, así que la vuelta atrás es barata, pero el
      backup cuesta segundos y ya salvó un despliegue.
- [ ] **La regla de ciclo de vida, aplicada y verificada** (arriba).
- [ ] **Confirmar que el driver de almacenamiento es S3** (`S3_BUCKET` definido en
      `server/.env.production`). Con el driver local, las piezas subidas **mueren con el
      contenedor** y la auditoría se queda sin nada que leer.
- [ ] **Mirar el gasto de IA.** Cada pieza subida dispara **dos llamadas de visión**; en las
      pruebas costaron ~USD 0,015 por pieza con Sonnet. Una campaña de seis piezas con dos
      versiones cada una son ~USD 0,18. No es mucho, pero es gasto nuevo que hoy **no pasa por la
      cuota** (ver más abajo).
- [ ] Avisar al equipo que el menú cambia: aparece **Producción** y la etapa 2 pasa a llamarse
      **Escribir**.

## La secuencia

```
1  pg_dump                                   ← backup
2  Regla de ciclo de vida del bucket         ← ANTES de que exista la primera pieza
3  deploy.sh                                 ← acá sí puede ir primero: las migraciones son aditivas
4  Verificación
5  Avisar al equipo y mostrar la pantalla
```

**El paso 3 puede ir primero, a diferencia del H1.** El contenedor corre `migrate deploy` al
arrancar y las dos migraciones del H2 —`20260922000000_h2_piezas` y `20260923000000_h2_auditoria`—
solo crean tablas y enums. No hay backfill entre ellas ni un `SET NOT NULL` que pueda fallar.

## Los tres pasos que sorprenden

**`sharp` agranda la imagen y el build tarda más.** Es la primera dependencia nativa del backend.
Ya está verificado que instala y corre en `node:20-slim` con los binarios precompilados, sin
paquetes de sistema extra, pero el primer `docker compose up --build` del día va a tardar más de
lo habitual. No es que se colgó.

**La auditoría corre en segundo plano y no bloquea la subida.** Si en los logs aparece
`[auditoria] versión <id>: ...`, la pieza igual quedó entregada y visible en *Por revisar*: lo
que falló es la verificación, y la tarjeta lo muestra como **«Sin auditoría»** con un botón para
reintentar. No es una entrega perdida.

**El gasto de auditar no cuenta para la cuota.** Se guarda en `PiezaVersion.costoUsd`, pero no
pasa por `UsagePeriod` ni por `GenerationLog`. Es la misma fuga que tiene Refinar y está anotada
en el inventario de [E6](./plan-e6-registro-consumo.md). Consecuencia concreta: **no calibrar la
cuota con datos posteriores a este despliegue** sin sumar a mano lo que gastó la auditoría, o el
número va a salir bajo.

## Verificación

Desde afuera, sin tocar la base:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://myvoice.lobueno.co/health     # 200
curl -s -o /dev/null -w "%{http_code}\n" https://myvoice.lobueno.co/api/piezas # 401 sin token
```

Y en la aplicación, con una campaña real:

- [ ] **Producción** aparece en el menú, también para alguien que **no** administra el workspace
      (un `MEMBER`). Es la primera pantalla de trabajo pensada para ese rol.
- [ ] Desde la Biblioteca, seleccionar copy aprobado y **Mandar a producción**: la propuesta
      agrupa por canal y deja afuera Google Ads, Push y WhatsApp con su motivo.
- [ ] Asignar una pieza y **subir un PNG**: pasa a *Por revisar*, aparece la previa y el semáforo
      dice **Auditando**.
- [ ] Un par de minutos después, el semáforo cambia y la orden de trabajo muestra el informe con
      los hechos y los juicios **separados**.
- [ ] Devolver a diseño exige motivo, y el motivo queda en el historial.
- [ ] La columna **Lista** exporta el Excel con sus dos hojas.

En la base, después de la primera pieza:

```sql
SELECT estado, count(*) FROM "Pieza" GROUP BY estado;
SELECT numero, "estadoAuditoria", "costoUsd", modelo FROM "PiezaVersion" ORDER BY "createdAt" DESC LIMIT 5;
```

## Si hay que volver atrás

Las migraciones son aditivas, así que el código viejo funciona contra la base nueva: **alcanza con
volver el repo al commit anterior y correr `deploy.sh`**. Las tablas de piezas quedan ahí sin que
nadie las lea, y los archivos subidos siguen en el bucket. No hace falta tocar la base ni
restaurar el dump.

La única precaución: si se vuelve atrás **después** de que alguien subió piezas, esas piezas
dejan de verse hasta volver a desplegar. No se pierden.

## Después del despliegue

- [ ] **Dos semanas de uso antes de construir la fase 4.** La fase 4 expone las piezas al cliente
      por un portal sin autenticación; conviene saber que el proceso interno funciona antes de
      abrirlo hacia afuera.
- [ ] Anotar cuántas piezas por semana pasan por el tablero: es el número que decide si vale la
      pena integrar Drive y si hay que paginar la columna *Lista*, que crece sin techo.
- [ ] Medir cuántos hallazgos se aceptan con nota y cuántos se corrigen. Es la métrica con la que
      D2 decide algún día si la auditoría se gana la autoridad de bloquear.
