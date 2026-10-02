# Capacitación con LoBueno — guion de punta a punta

Una sesión de capacitación necesita dos cosas que una base vacía no tiene: **trabajo ya hecho**,
para mostrar cómo se ve cada pantalla cuando la herramienta está en uso, y **trabajo pendiente**,
para que quienes aprenden hagan cada paso en vivo. `npm run seed:capacitacion` deja las dos en un
workspace propio, «LoBueno · Capacitación», y este documento es el recorrido.

La marca es LoBueno (el fixture de `shared/lobuenoBrand.ts`): agencia que vende My Voice, con voz
sobria, «usted», cifras en lugar de adjetivos. Las fechas se corren a la fecha de la corrida, así
que la campaña siempre «arrancó hace dos semanas».

## Antes de la sesión

```bash
cd server
CAPACITACION_PASSWORD='…' npm run seed:capacitacion
```

- **Es un reset.** Cada corrida borra el workspace `lobueno-capacitacion` y lo vuelve a armar. Se
  corre antes de cada sesión, y al terminar la sesión no hay nada que limpiar. No toca ningún otro
  workspace.
- La salida imprime los **dos enlaces del cliente** (sin login). Cambian en cada corrida.
- Contra producción: correrlo desde una máquina de trabajo con el `DATABASE_URL`, el `S3_BUCKET` y
  las credenciales de AWS de producción, igual que `seed:lobueno`. No se corre dentro del contenedor:
  la imagen no tiene fuentes para dibujar las artes y tampoco trae `shared/`.
- Deja en `server/capacitacion-artes/` las dos imágenes que el diseñador sube en vivo.
- Los cuatro usuarios están en `@capacitacion.lobueno.co`, un dominio sin buzones. Si el correo
  saliente está prendido, los avisos rebotan; no le llegan a nadie real.

### El equipo

| Usuario | Persona | Rol | Función | Para mostrar |
|---|---|---|---|---|
| `laura@` | Laura Gómez, Dirección de cuentas | OWNER | Aprobación | Marcas, revisiones, aceptar/devolver piezas |
| `andres@` | Andrés Mejía, Redacción | ADMIN | Copy | Generar, Historial, Copy aprobado |
| `sofia@` | Sofía Vargas, Diseño | MEMBER | Diseño | «Mis piezas», subir arte |
| `mateo@` | Mateo Ríos, Diseño | MEMBER | Diseño | El diseñador con trabajo cerrado |

La clienta es **Natalia Ospina (Mercadeo LoBueno)**. No tiene cuenta: revisa desde los enlaces.
Lo más cómodo es tener tres ventanas: Laura, una en incógnito para Sofía y los enlaces del cliente
en otra.

## El estado que encuentra

| Campaña | Dónde está | Qué hay |
|---|---|---|
| Lanzamiento My Voice | Producción, con revisión de piezas pendiente | 4 generaciones, 40 copys guardados, ronda de copy cerrada (2 rechazos), 6 piezas |
| El costo del copy genérico | Esperando a la clienta | 1 generación, 15 copys sin aprobar, enlace de revisión abierto |
| Talento 2026 | Solo el brief | Nada: es la que se genera en vivo |

## El recorrido

Las etapas siguen el menú: Preparar → Escribir → Aprobar → Producir → Medir. Cada una tiene
**Mostrar** (lo que ya está) y **En vivo** (lo que se hace en la sesión).

### 1. Preparar — Marcas (Laura)

**Mostrar.** La tarjeta de LoBueno dice «Motor entrenado · 61 variaciones · 41 aprobadas». Adentro:
voz, propuesta de valor, prohibiciones (*revolucionario, disruptivo, potenciar…*), el **fingerprint**
(arquetipo «El Sabio», 8,4 palabras por frase, cero emojis, tics) y los tres briefs. Los
anti-ejemplos son la otra mitad de la memoria: «¡Descubre la revolución del copywriting! 🚀» y por
qué está mal.

**En vivo.** El indicador marca ADN 4/5: falta la guía de marca en PDF. Subir un PDF de guía
muestra cómo se completa — y la extracción lee el PDF con IA, así que también gasta unos centavos y
puede reescribir campos del ADN. Si no se quiere eso, mostrarlo sin subir nada.

### 2. Escribir — Generar e Historial (Andrés)

**Mostrar.** Historial tiene cuatro generaciones. La del 8 canales es la buena: concepto «Rápido
escribe cualquiera. Como usted, nadie.», 76 variaciones, y una regeneración de WhatsApp sola veinte
minutos después (lo que se hace cuando un canal sale flojo). La primera, de cuatro canales, es el
intento antes de afinar el brief.

**En vivo.** Generar con el brief **«Reclutamiento creativo — Talento 2026»**, dos o tres canales
(Instagram Post, Email, WhatsApp). Mientras corre, señalar el orden: primero el concepto, después
cada canal, al final el informe de coherencia. Guardar en «Copy aprobado» dos o tres variaciones con
la campaña «Talento 2026».

> **Esto gasta crédito real** del proveedor configurado — unos centavos de dólar por generación. Lo
> mismo las dos subidas de arte (cada una corre una auditoría) y, si se hace, la guía en PDF del
> paso 1. Nada más del guion llama a la IA.

### 3. Aprobar — Copy aprobado y Revisiones

**Mostrar (Laura).** En Revisiones, la ronda de copy del Lanzamiento ya cerrada: Natalia aprobó casi
todo y rechazó dos con sus palabras — el asunto «Su marca ya tiene voz. ¿La está usando?» («suena a
regaño») y el título «Demo con su propia marca» («es casi igual al de la competencia»). Esos dos
rechazos ya están en los anti-ejemplos de la marca: así aprende el motor.

**En vivo (clienta).** Abrir el enlace **«Copy, campaña 2»** que imprimió el seed. Aprobar casi todo,
rechazar uno con comentario, enviar. Volver a Laura: la sesión pasa a completada, los aprobados se
marcan en Copy aprobado y el rechazo aparece como anti-ejemplo en la marca.

### 4. Producir — el tablero (Laura, Sofía)

El tablero de LoBueno tiene una pieza en cada situación que vale mostrar:

| Columna | Pieza | Lo que enseña |
|---|---|---|
| Por asignar | Carrusel — Adivine cuál es su marca | Crear y asignar son dos decisiones |
| En diseño | Post de feed (B) — Le medimos la voz | El A/B (comparte cuerpo con el post A) y el aviso **«El copy cambió después de aprobarse»** |
| Por revisar | Historia — ¿Su copy suena a su marca? | Una auditoría con **2 hallazgos** esperando decisión |
| Lista | Post de feed — Rápido escribe cualquiera | La historia completa: v1 devuelta, v2 aceptada |
| Lista | Email de lanzamiento | Un hallazgo **Ilegible** aceptado con nota: ilegible no es «mal» |
| Lista | TikTok | El video se entrega con enlace, sin archivo ni auditoría |

**Mostrar.** Abrir el Post de feed listo y recorrer sus versiones: en la v1 la auditoría encontró
«Rapido» sin tilde (un **hecho**: muestra lo esperado y lo encontrado lado a lado) y un «¡Pida su
demo!» con exclamación (un **juicio** de marca). Laura los marcó como corregidos y la devolvió con
nota; la v2 salió limpia.

**En vivo, en este orden:**

1. **Asignar (Laura).** Carrusel → asignar a Mateo. La pieza pasa a En diseño y a Mateo le llega el
   aviso.
2. **Decidir hallazgos y devolver (Laura).** La campana tiene «Una pieza espera tu visto bueno».
   Abrir la Historia: el hecho dice «competencia» donde el aprobado dice «categoría», y el juicio
   marca que «Desliza» tutea. Marcar los dos como corregidos y **devolver a diseño** con una nota.
3. **Actualizar el copy y subir (Sofía).** En «Mis piezas», el Post (B) muestra el aviso de copy
   cambiado: Andrés ajustó el hook después de hablar con Natalia. Actualizar el copy de la pieza y
   subir `server/capacitacion-artes/1-post-ab-1080x1080.png`. La tarjeta dice «Auditando» y en un
   minuto llega el informe real.
4. **Subir la corrección (Sofía).** En la Historia devuelta, subir
   `2-historia-corregida-1080x1920.png` (v2). Laura la acepta.

> Si en el paso 3 se sube el arte **sin** actualizar el copy, la auditoría marca el hook como
> diferente: el arte tiene el texto nuevo y la pieza todavía el viejo. Es un buen error para
> cometer a propósito.

### 5. Aprobar el arte — la ronda de piezas (clienta)

La campaña Lanzamiento pide aprobación del cliente sobre las piezas, así que la columna Lista
ofrece «Mandar las piezas al cliente». Ya hay una sesión abierta con el Post y el Email.

**En vivo.** Abrir el enlace **«Piezas, campaña 1»**. Aprobar el Email; en el Post pedir cambios
**solo de copy**. Volver al tablero: el Post **sigue en Lista**, porque el diseñador no puede hacer
nada hasta que el copy cambie (ver `services/revisionDePiezas.ts`). Si en cambio se piden cambios de
diseño, vuelve a En diseño.

### 6. Medir — Métricas (Laura)

**Importante:** elegir **«Últimos 30 días»**. «Este mes» muestra solo lo generado en el mes
calendario en curso, y las generaciones sembradas tienen entre 3 y 24 días: a comienzos de mes esa
vista sale casi vacía (y con la generación en vivo del paso 2).

**Mostrar.** Gasto y tokens por etapa (director, writer, critic, fixer, supercritic), el porcentaje
de caché y el costo por generación: el de 8 canales costó unos 30 centavos de dólar.

## Después

Nada. La próxima sesión vuelve a correr `seed:capacitacion` y todo arranca igual. Las artes que
siembra el script usan claves fijas (`piezas/*/capacitacion/…`), así que cada corrida pisa las
anteriores en vez de acumularlas.

Las dos que se suben en vivo sí quedan: llevan la clave de una pieza que el reset ya borró. El
original lo elimina a los 90 días la regla del bucket (ver `docs/despliegue-h2.md`); el snapshot
(~100 KB) es permanente por diseño y queda huérfano. Son dos por sesión: no vale la pena un
limpiador hasta que se hagan decenas.
