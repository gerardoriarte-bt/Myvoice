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

1. **Tablero de producción.** Las piezas aprobadas, agrupadas y asignables. Es la pantalla que
   define qué es una "pieza" para el producto — la más importante de las seis.
2. **Orden de trabajo.** Lo que ve el diseñador: el copy aprobado por slot, el brief de
   producción del canal, la marca, sus prohibiciones y el formato esperado.
3. **Subida de la pieza**, con la auditoría corriendo.
4. **Informe de auditoría.** Los dos chequeos en un mismo lugar, distinguibles: uno compara
   contra un texto conocido, el otro juzga contra reglas.
5. **El tablero del que aprueba**, que no es el del diseñador.
6. **La navegación de seis etapas**, actualizando la de cuatro que ya está implementada.

## Decisiones

**D1 · ¿La unidad del tablero es la pieza o la variación de copy?**
Una pieza gráfica combina varios slots —hook, cuerpo, hashtags— y a veces sirve a dos canales.
Si la unidad es la variación, el diseñador recibe tres tarjetas para un solo diseño.
*Recomendación:* la **pieza**, agrupando uno o más slots aprobados. Es la decisión más cara de
revertir: define una entidad nueva.

**D2 · ¿La auditoría bloquea o avisa?**
*Recomendación:* avisa. El mismo criterio que la cuota, que se desplegó en observación por una
razón: un chequeo automático que corta el trabajo de alguien tiene que ganarse esa autoridad con
historial. Un bloqueo mal calibrado se desactiva en una semana y no vuelve.

**D3 · ¿Quién ve el informe y con qué detalle?**
*Recomendación:* el diseñador ve cada hallazgo; quien aprueba ve un semáforo y puede abrir.

**D4 · ¿La pieza vuelve al portal del cliente?**
Es el argumento comercial más fuerte de la fase: el cliente aprueba el copy y después la pieza,
en la misma herramienta, sin cadenas de mail. *Recomendación:* sí, pero como fase 4.

**D5 · ¿Qué estados tiene una pieza?**
Cada estado es una columna y una transición que alguien ejecuta. *Recomendación:* los mínimos, y
agregar solo los que alguien pida.

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
