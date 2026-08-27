# Plan H2 — Producción y auditoría de piezas

> Cierra el círculo del producto: del copy aprobado a la pieza terminada y verificada.
> Reemplaza lo que el [ROADMAP](./ROADMAP.md) llamaba H2.B, que asumía algo distinto.
> Escrito en [dos niveles](./ROADMAP.md): el nivel 1 se resuelve en el `.pen`, el nivel 2 en código.

## Qué estaba mal en el roadmap

H2.B decía: *"conectarlos a generación visual convierte la salida de texto en Excel a pieza casi
lista"*. Asumía que **la IA genera la pieza**.

No es así. La pieza la hace un **equipo de diseño humano**, y la IA entra **después**, a auditar
lo que ese equipo produjo. Es otra funcionalidad: otro costo, otro riesgo y otro criterio de
éxito. Generar una imagen plausible es barato de prometer y caro de acertar; verificar que una
pieza dice lo que se aprobó es acotado, comprobable y no depende de que el modelo tenga buen
gusto.

## El proceso real tiene seis etapas, no cuatro

La navegación implementada cuenta cuatro y se corta en la aprobación:

```
1 Preparar   2 Producir   3 Aprobar y medir   4 Administrar
```

El proceso completo:

```
1 Preparar   Marcas — el ADN
2 Producir   Generar · Biblioteca · Historial
3 Aprobar    Revisiones — el cliente aprueba o rechaza
4 Asignar    ← NUEVO. Las piezas aprobadas se ordenan y se asignan a un diseñador,
                con el brief de producción que el motor ya emite
5 Auditar    ← NUEVO. El diseñador sube la pieza; la IA la revisa
6 Medir      Métricas
```

Las etapas 4 y 5 no existen. Ahí está la mitad del valor del producto sin entregar, y es lo que
convierte a My Voice de "generador de copy" en infraestructura del proceso creativo — que es
literalmente el objetivo declarado del H2.

## Sobre qué se apoya (y qué falta)

Lo que **ya está** y hace esto viable ahora y no antes:

- **`SavedVariation.slot`, `slotLabel` y `variationIndex`**, que persisten desde B3. Sin el slot
  no se puede decir "esta pieza tiene que contener el hook y el cuerpo del Instagram Post": el
  hook y el cuerpo eran indistinguibles.
- **Los cuatro canales de instrucción de producción** — `visualBrief`, `animationBrief`,
  `structure`, `production` — que el motor emite y **hoy nadie consume**. Son exactamente el
  brief que el equipo de diseño necesita. Esta etapa es su destino.
- **`ReviewSession` con las decisiones del cliente**: la entrada del tablero es lo aprobado ahí.
- **El fingerprint de marca y las prohibiciones**, que ya alimentan al Critic: son el reglamento
  con el que se audita.
- **La telemetría de costo por etapa** (B0), que permite medir cuánto cuesta auditar una pieza
  desde el primer día.

Lo que **falta y es bloqueante**:

- **E1 · migrar uploads a S3 deja de ser recomendable y pasa a ser prerrequisito.** Hoy los
  archivos van al disco local del contenedor y **ya hubo un outage por disco lleno** con PDFs de
  marca. Las piezas de diseño son órdenes de magnitud más pesadas y llegan varias por campaña.
  Construir la etapa 5 sobre el disco local es repetir un incidente conocido, más rápido.
- **`aiClient` no tiene camino para imágenes.** Los cuatro proveedores se manejan con el SDK de
  OpenAI cambiando el `baseURL`, y todas las llamadas son de texto. La auditoría necesita
  entrada de imagen, y eso toca el único call site de `chat.completions.create`, que es
  deliberadamente único. No es una línea: es una segunda forma de llamada con sus propios
  errores, límites de tamaño y costo.

---

# Nivel 1 · Diseño

**Entregable:** `design/MyVoice_Engine.pen`. No se escribe código en este nivel.

## Pantallas a diseñar

1. **Tablero de producción.** Las piezas aprobadas, agrupadas y asignables. Es la pantalla nueva
   más importante: define qué es una "pieza" para el producto.
2. **Detalle de pieza / orden de trabajo.** Lo que ve el diseñador: el copy aprobado por slot, el
   brief de producción del canal, la marca y sus prohibiciones, el formato esperado.
3. **Subida de la pieza terminada.** Con el estado de la auditoría corriendo.
4. **Informe de auditoría.** Los dos chequeos en un mismo lugar: qué dice la pieza contra qué se
   aprobó, y ortografía, estilo y prohibiciones contra el ADN.
5. **El tablero visto por el que aprueba**, que no es el mismo que el del diseñador.
6. **La navegación de seis etapas**, actualizando la que ya está implementada.

## Decisiones a validar

**D1 · ¿Cuál es la unidad del tablero: la pieza o la variación de copy?**
Una pieza gráfica combina varios slots —hook, cuerpo, hashtags— y a veces varios formatos del
mismo canal. Si la unidad es la variación, el diseñador recibe tres tarjetas para un solo
diseño. *Recomendación:* la unidad es **la pieza**, que agrupa uno o más slots aprobados del
mismo canal. Requiere una entidad nueva; es la decisión más cara de revertir.

**D2 · ¿La auditoría bloquea o avisa?**
*Recomendación:* avisa. El mismo criterio que la cuota, que se desplegó en modo observación por
una razón: un chequeo automático que corta el trabajo de alguien tiene que ganarse esa autoridad
con historial. Un informe que el humano decide atender es útil desde el primer día; un bloqueo
mal calibrado se desactiva en una semana y no vuelve.

**D3 · ¿Quién ve el informe?**
El diseñador lo necesita para corregir. El que aprueba, para decidir. *Recomendación:* los dos,
pero con distinto detalle — el diseñador ve cada hallazgo; quien aprueba ve un semáforo y puede
abrir.

**D4 · ¿La pieza terminada vuelve al portal de revisión del cliente?**
Cierra el círculo: el cliente aprobó el texto, ahora ve la pieza. *Recomendación:* sí, y es el
argumento comercial más fuerte de todo el H2 — el cliente aprueba una vez el copy y otra la
pieza, en la misma herramienta, sin cadenas de mail. Pero es alcance aparte: primero el ciclo
interno.

**D5 · ¿Qué estados tiene una pieza?**
Aprobada → asignada → en producción → subida → auditada → lista. Cada estado que se agrega es una
columna en el tablero y una transición que alguien tiene que ejecutar. *Recomendación:* empezar
con los mínimos y agregar solo los que alguien pida.

## Estados límite

- Una pieza que combina slots de **dos canales** (el mismo visual para Post e Historia).
- Copy aprobado que **cambia después** de asignada la pieza.
- Una pieza subida en formato inesperado, o de 40 MB.
- Auditoría que no puede leer el texto de la imagen: tipografía fina, texto sobre foto, curvas.
- Un canal de solo texto (Cuña de Radio) que no produce pieza gráfica: **no todo lo aprobado va
  al tablero**, y el diseño tiene que decir cuál sí.

---

# Nivel 2 · Implementación

Sin estimar hasta que el nivel 1 esté cerrado. El orden sí está claro:

**Fase 0 — E1 primero.** Migrar uploads a S3. No es parte de esta funcionalidad, es su piso.

**Fase 1 — El modelo.** La entidad "pieza" con sus estados, su relación con las
`SavedVariation` aprobadas que la componen, y su asignación a un usuario del workspace. Con las
guardas de `lib/tenancy.ts` desde el primer handler: una pieza es data de negocio y vive en un
workspace.

**Fase 2 — El tablero**, sin auditoría. Ya entrega valor solo: hoy el paso de aprobado a
producción se coordina por fuera.

**Fase 3 — Subida y auditoría.** Entrada de imagen en `aiClient`, con su propio manejo de
errores y su costo medido por `pricing.ts` como una etapa más. Los dos chequeos de D3 son dos
llamadas distintas: comparar contra un texto conocido es barato y determinista de evaluar;
auditar estilo contra el ADN es del mismo tipo que el Critic y puede reusar su prompt.

**Fase 4 — La pieza vuelve al cliente** (D4), si se confirma.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Las piezas llenan el disco del contenedor | E1 antes que nada. No empezar sin eso |
| La auditoría de imagen cuesta por pieza y nadie lo ve venir | Medirla como etapa desde la fase 3, con la telemetría que ya existe |
| El tablero se convierte en un gestor de proyectos a medias | Estados mínimos (D5). Si el equipo ya vive en otra herramienta, competir con ella se pierde |
| La IA marca errores donde no los hay y el equipo deja de leerla | Modo aviso (D2), y medir cuántos hallazgos se aceptan antes de darle más autoridad |
