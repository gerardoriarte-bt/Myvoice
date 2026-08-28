# Plan de fase — Del copy aprobado a la pieza verificada

> La evolución que convierte a My Voice de generador de copy en infraestructura del proceso
> creativo. Absorbe lo que el [ROADMAP](./ROADMAP.md) listaba por separado como H2.A
> (composición) y H2.B (briefs de producción), porque son una sola cosa.
>
> **Esta fase no entra en el despliegue de mañana.** Ver la separación abajo.

---

## Separación: qué se despliega mañana y qué es esta fase

Lo que está listo y **sí** va mañana:

| Lote | Qué es | Estado |
|---|---|---|
| **H1.A** — multi-tenant real | Aislamiento por workspace, membresías, invitaciones, claves cifradas | `verify:isolation` 27/27, secuencia ensayada |
| **H1.B** — motor serio | Telemetría de costo, cuota por periodo, resiliencia, slot persistido | los cuatro criterios verificados |
| **E5** — consistencia de interfaz | Un nombre por pantalla, un negro, una escala, navegación por etapas | verificado en el navegador |

Lo que **no** va mañana y es esta fase: todo lo de abajo. No comparte código con el lote de
mañana, no toca sus migraciones y no depende de su despliegue más que en el orden lógico —
conviene que el H1 lleve una semana en producción antes de empezar a construir encima.

**Regla de la separación:** esta fase no agrega nada al runbook de mañana. Si algo de acá
aparece en ese runbook, algo se mezcló.

---

## Qué incluye la fase

El proceso completo tiene seis etapas. Las dos del medio no existen:

```
1 Preparar   Marcas — el ADN                            ✓ existe
2 Producir   Generar · Biblioteca · Historial           ✓ existe
3 Aprobar    Revisiones — el cliente aprueba el copy    ✓ existe
4 Asignar    Tablero: la pieza se ordena y se asigna    ← esta fase
5 Auditar    Se sube la pieza; la IA la verifica        ← esta fase
6 Medir      Métricas                                    ✓ existe
```

**4 · Asignar.** Lo aprobado se agrupa en piezas, se ordena y se asigna a alguien del equipo de
diseño, con el brief de producción que el motor ya emite.

**5 · Auditar.** El diseñador sube la pieza terminada y la IA hace **dos chequeos distintos**:

- **¿Dice lo que se aprobó?** Lee el texto dentro de la pieza y lo compara contra el copy
  aprobado, que ya está en la base con su slot. Es una comparación contra una verdad conocida:
  acotada, determinista de evaluar y la más valiosa de las dos.
- **¿Respeta la marca?** Ortografía, estilo, tono y prohibiciones, contra el mismo fingerprint
  que ya alimenta al Critic.

### Qué no incluye

- **Generación visual por IA.** El roadmap la prometía; no es lo que se va a construir.
- **Reemplazar la herramienta de diseño.** La pieza se produce en Figma, Illustrator o donde sea.
  Acá vive la orden de trabajo y la verificación, no el archivo editable.
- **Ser un gestor de proyectos.** Estados mínimos. Si el equipo ya vive en otra herramienta,
  competir con ella se pierde.
- **La aprobación de la pieza por el cliente.** Es el cierre natural del círculo (D4) y quedó
  fuera del alcance inicial a propósito: primero el ciclo interno funcionando.

---

## El orden: el diseño va primero

```
Fase 0 · DISEÑO          en el .pen · no se escribe código
Fase 1 · E1 — S3         prerrequisito duro, no es parte de la funcionalidad
Fase 2 · Modelo + tablero    ya entrega valor sin auditoría
Fase 3 · Subida + auditoría  las dos verificaciones
Fase 4 · La pieza al cliente  si D4 se confirma
```

Ninguna fase arranca con decisiones de la anterior abiertas. La 0 no es una formalidad: **la
decisión D1 define una entidad nueva en la base**, y equivocarla se paga con una migración.

---

# Fase 0 · Diseño

**Entregable:** `design/MyVoice_Engine.pen`. **Criterio de cierre:** las seis pantallas
dibujadas, las cinco decisiones resueltas con una nota que diga qué se eligió y por qué, y los
cinco estados límite dibujados. Sin eso, la fase 1 arranca adivinando.

## Pantallas

Eran seis; son cinco. La subida dejó de ser pantalla y pasó a ser un estado de la tarjeta.

1. **Tablero de producción** — dibujado. Alcance **por marca**, con la identidad de la marca
   activa en el encabezado, igual que el resto del producto.
2. **Orden de trabajo** — dibujada. Lo que ve el diseñador antes de abrir Figma.
3. ~~Subida de la pieza~~ → **absorbida en la tarjeta**. Se sube desde el tablero o desde la
   orden de trabajo; no necesita pantalla propia.
4. **Informe de auditoría** — dibujado.
5. **Vista «Mis piezas»** — pendiente. El tablero es por marca, pero el equipo de diseño trabaja
   cruzando marcas: alguien con tres piezas de Terpel y dos de Huggies no puede tener que
   cambiar de marca para ver su propio trabajo. Misma data, alcance por persona.
6. **La navegación de seis etapas**, actualizando la de cuatro que ya está implementada.

## Decisiones

**D1 · ¿La unidad del tablero es la pieza o la variación de copy? — DECIDIDA: la pieza.**
Las dos opciones se dibujaron con la misma campaña y los mismos aprobados: la pieza da **6
tarjetas**, la variación da **13**, cuatro de ellas un mismo carrusel. El argumento que decidió
no fue el conteo sino que **el brief de producción que el motor ya emite describe una pieza, no
un slot**: en el modelo por variación no hay dónde ponerlo, y es justamente lo que hace que el
tablero valga más que una lista de textos aprobados. Costo asumido: una entidad nueva y su
migración.

**D2 · ¿La auditoría bloquea o avisa?**
*Recomendación:* avisa. El mismo criterio que la cuota, que se desplegó en observación por una
razón: un chequeo automático que corta el trabajo de alguien tiene que ganarse esa autoridad con
historial. Un bloqueo mal calibrado se desactiva en una semana y no vuelve.

**D3 · ¿Quién ve el informe y con qué detalle?**
*Recomendación:* el diseñador ve cada hallazgo; quien aprueba ve un semáforo y puede abrir.

**La regla de la auditoría, que salió de dibujarla:** los dos chequeos **no son la misma clase
de cosa y no pueden verse iguales**. «¿Dice lo que se aprobó?» compara contra una verdad conocida
—el copy está en la base con su slot— y muestra el texto exacto de los dos lados: es un hecho.
«¿Respeta la marca?» es un juicio, del mismo tipo que el Critic. Mezclarlos en una lista destruye
la confianza en el primero.

Y el estado que decide si la herramienta sobrevive a la primera semana: **«no se pudo leer»**.
Cuando la auditoría no puede extraer un texto —6 px sobre una foto—, lo dice y aclara que eso no
significa que esté mal. Reportar un falso «no coincide» ahí hace que el diseñador la desactive
mentalmente y no vuelva.

**D4 · ¿La pieza vuelve al portal del cliente?**
Es el argumento comercial más fuerte de la fase: el cliente aprueba el copy y después la pieza,
en la misma herramienta, sin cadenas de mail. *Recomendación:* sí, pero como fase 4.

**D5 · ¿Qué estados tiene una pieza? — DECIDIDA: cuatro columnas, cada una con dueño.**

| Columna | Dueño | Qué la saca de ahí |
|---|---|---|
| Por asignar | Quien produce | Asignar a un diseñador |
| En diseño | El diseñador | Subir la pieza terminada |
| Por revisar | Quien aprueba | Aceptar, o devolver a diseño |
| Lista | Nadie: es el final | — |

El criterio que las define: **cada columna tiene un dueño y una acción que la vacía.** Una
columna sin dueño humano es una columna donde las cosas se quedan.

Eso corrigió dos errores del primer dibujo. «En auditoría» **no es columna**: dura minutos, la
mueve el sistema y nadie puede desatascarla. Y una pieza con hallazgos **no puede estar en
«Lista»**: falta que alguien decida si se aceptan, y ese estado —«Por revisar»— no existía.

Lo que no merece columna va como estado en la tarjeta: `Auditando`, `2 hallazgos`, `Verificada`,
`Devuelta`.

**La regla para cuando alguien pida una columna nueva:** que traiga su dueño y la acción que la
vacía. Si no los tiene, es un estado de la tarjeta. Es lo único que evita que el tablero se
convierta en el gestor de proyectos a medias que esta misma fase declara fuera de alcance.

## Estados límite

- Una pieza que sirve a **dos canales** (el mismo visual para Post e Historia).
- El copy aprobado **cambia** después de asignada la pieza.
- Una pieza subida en formato inesperado, o de 40 MB.
- La auditoría **no puede leer** el texto: tipografía fina, texto sobre foto, curvas.
- Un canal que **no produce pieza gráfica** (Cuña de Radio). No todo lo aprobado va al tablero, y
  el diseño tiene que decir cuál sí — o el tablero se llena de tarjetas que nadie puede trabajar.

---

# Fases 1 a 4 · Implementación

Sin estimar hasta que la fase 0 cierre. Estimarla antes sería inventar.

**Fase 1 · E1 — migrar uploads a S3.** No es parte de la funcionalidad: es su piso.

**Fase 2 · Modelo y tablero.** La entidad pieza con sus estados, su relación con las
`SavedVariation` aprobadas que la componen y su asignación a un miembro del workspace. Guardas de
`lib/tenancy.ts` desde el primer handler. **Entrega valor sola**: hoy el paso de aprobado a
producción se coordina por fuera del sistema.

**Fase 3 · Subida y auditoría.** Entrada de imagen en `aiClient`, con su costo medido como una
etapa más. Los dos chequeos son dos llamadas distintas: comparar contra un texto conocido es
barato; auditar estilo contra el ADN es del mismo tipo que el Critic y puede reusar su prompt.

**Fase 4 · La pieza vuelve al cliente**, si D4 se confirma.

## Prerrequisitos duros

**E1 · Migrar uploads a S3.** Pasa de recomendable a bloqueante. Hoy los archivos van al disco
local del contenedor y **ya hubo un outage por disco lleno** con PDFs de marca. Las piezas de
diseño pesan órdenes de magnitud más y llegan varias por campaña. Construir la fase 3 sobre ese
disco es repetir un incidente conocido, más rápido.

**Entrada de imagen en `aiClient`.** Los cuatro proveedores se manejan con el SDK de OpenAI
cambiando el `baseURL`, y todas las llamadas son de texto. La auditoría necesita imágenes, y eso
toca el único call site de `chat.completions.create`, que es único a propósito. No es una línea:
es una segunda forma de llamada con sus propios errores, límites de tamaño y costo.

## Sobre qué se apoya

Lo que hace esto viable ahora y no antes:

- **`SavedVariation.slot`**, persistido en B3. Sin el slot no se puede decir "esta pieza tiene
  que contener el hook y el cuerpo del Instagram Post": eran indistinguibles.
- **Los cuatro canales de instrucción** —`visualBrief`, `animationBrief`, `structure`,
  `production`— que el motor emite y hoy nadie consume. Son el brief que el diseñador necesita.
- **`ReviewSession`** con las decisiones del cliente: la entrada del tablero.
- **El fingerprint y las prohibiciones**: el reglamento de la auditoría.
- **La telemetría por etapa** (B0): permite medir el costo de auditar desde el primer día.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Las piezas llenan el disco del contenedor | E1 antes que nada. No empezar sin eso |
| Auditar imágenes cuesta por pieza y nadie lo ve venir | Medirlo como etapa desde la fase 3 |
| El tablero se vuelve un gestor de proyectos a medias | Estados mínimos (D5) |
| La IA marca errores donde no los hay y el equipo deja de leerla | Modo aviso (D2); medir cuántos hallazgos se aceptan antes de darle autoridad |
| La fase se mezcla con el despliegue de mañana | No comparte código ni migraciones. Si aparece en ese runbook, algo se mezcló |
