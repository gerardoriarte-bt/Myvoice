# Evals · cómo sabemos que funciona

Estado: propuesta · 2026-10-28

Cada eval dice qué mide, cómo, cuándo corre y si **gasta crédito de IA**. Las que gastan no corren en
CI: se corren a mano antes y después de cada entrega, y su resultado se anota en la bitácora de esa
sesión ([../bitacora/](../bitacora/README.md)).

## 1. Inventario

| Id | Qué mide | Cómo | Cuándo | Gasta | Estado |
|---|---|---|---|---|---|
| E-1 | **Calidad del copy** contra el manual de oficio, regla por regla | `verify:calidad`: genera con el motor y juzga con un juez distinto del revisor; infracciones cada 100 textos | Antes y después de cada cambio de motor | Sí | Hecho (PR #43), sin línea base corrida |
| E-2 | **Ningún texto aprobado se pasa del largo** máximo de su campo | Determinística sobre `SavedVariation` aprobadas vs `FormatoUsado` | CI y cada entrega | No | Por hacer |
| E-3 | **El motor no inventa** decisiones de campaña (concepto, mensaje, tono, CTA fuera del brief) | Juez por pregunta sobre un set fijo de briefs | Cada cambio de prompt | Sí | Por hacer |
| E-4 | **Textos raíz**: distintos entre sí y propios de su etapa | Juez: diversidad (pares casi iguales) y ajuste a la etapa | Cada cambio de prompt de raíces | Sí | Por hacer |
| E-5 | **Fidelidad de la adaptación** a su texto raíz y a las audiencias de la campaña | Juez sobre pares raíz → variación | Cada cambio de prompt de adaptación | Sí | Por hacer |
| E-6 | **Aislamiento** entre workspaces, marcas y módulos | `verify:isolation`, ampliado: marca sin CDM → 404 en `/cdm/*`; cuadro ajeno → 404 | CI | No | Hecho para lo de hoy; ampliar |
| E-7 | **Contrato CDM ↔ My Voice**: un cuadro malo se rechaza con su motivo; uno bueno llega igual | Determinística con una planilla de casos malos (sin campos de texto, piezas fuera de rango, `lineaId` repetido) | CI | No | Por hacer |
| E-8 | **Resiliencia** del motor: reintentos, tiempos, errores terminales | `verify:resiliencia` | CI | No | Hecho |
| E-9 | **Escala**: un cuadro de 200 líneas se genera en tiempo y costo dentro del presupuesto | Corrida con un cuadro sintético; tiempo total, costo, fallos por línea | Antes de encender CDM en una marca | Sí | Por hacer |
| E-10 | **Se entiende sin explicación**: encontrar a quién espera una campaña, aprobar un grupo, armar un cuadro | Prueba con 3 a 5 personas del equipo, tareas cronometradas sobre el prototipo o el piloto | Al cerrar el diseño de cada flujo | No | Por hacer |

## 2. Reglas

- Una eval que **no se corrió** no cuenta como verde. La bitácora dice cuáles se corrieron y con qué
  resultado.
- Un juez de IA **no es el mismo prompt** que el revisor del motor (si se puede, otro proveedor).
- Los sets de casos con datos de clientes quedan fuera de git (como `server/.calidad/`).
- Una eval nueva entra aquí antes de construir lo que mide.
