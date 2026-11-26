# Medición: eficiencia, gasto y uso

> 2026-11-26. Gerardo arma la línea base del proceso y la va a comparar con lo que mide la herramienta. Para que la
> comparación valga, las dos tienen que medir lo mismo, con las mismas definiciones. Este documento las fija.
> Todo lo ve solo el super admin, en **Control** (decisión 27).

## 1. Qué se mide y dónde

| Pestaña de Control | Pregunta | Fuente | Código |
|---|---|---|---|
| **Eficiencia** | ¿Cuánto tarda cada fase de una campaña, cuántos ajustes pide el cliente y hace el equipo, y cuánta IA cuesta? | Eventos que la herramienta ya guarda (sábana, copy, piezas, anuncios), calculados al leer | `server/src/plataforma/eficiencia.ts` |
| **Uso** | ¿Quién usa la herramienta, qué días, en qué áreas? | `UsoDiario` (desde 2026-11-26) | `server/src/comun/usoDiario.ts`, `server/src/plataforma/uso.ts` |
| **Gasto de IA** | ¿Cuánto se gastó por workspace y marca? | `GenerationLog`, `PiezaVersion.costoUsd`, `ConsumoIa` | `analyticsController.getUsageAnalytics` |

Eficiencia y Uso se descargan en Excel con una hoja «Cómo se mide» que repite estas definiciones.

## 2. Quién entra en la cuenta

- **Workspaces:** solo los que tienen «Cuenta en métricas» encendido (Control › Workspaces). La migración dejó
  **LoBueno · Capacitación** apagado, porque se reinicia con datos de muestra. Antes de tomar la línea base hay que
  revisar el interruptor de cada workspace: cualquiera de prueba se apaga ahí. Si eliges un workspace apagado, se
  muestra igual, con un aviso.
- **Campañas (Eficiencia):** solo las que tienen actividad: sábana, copy guardado, piezas o generaciones. Desde el
  24-nov cada brief es una campaña, así que hay muchas vacías; se cuentan aparte («sin actividad fuera de la cuenta»).
- **Periodo (Eficiencia):** entra una campaña si se creó **o tuvo movimiento** dentro del periodo. Antes solo contaba
  la fecha de creación, y una campaña larga que seguía viva quedaba fuera.
- **Personas (Uso):** las que tienen acceso a un workspace que cuenta, **sin los super admin**: su uso es
  administrar y probar, no trabajar.

## 3. Tiempos

**Horas hábiles:** de lunes a viernes, de 8:00 a 18:00, hora de Bogotá (siempre UTC−5), sin los festivos de Colombia.
Los festivos se calculan con la ley Emiliani y la Pascua (`server/src/plataforma/horasHabiles.ts`), comprobados
contra los 18 de 2026. Un «día hábil» en pantalla son 10 h. Las **horas corridas** se muestran al lado. La línea base
tiene que usar las mismas unidades que el proceso de antes; si el de antes se midió en días calendario, se compara
con horas corridas.

Cada fase va de cuándo **empezó** a cuándo **terminó todo lo esperado**. Lo esperado es lo pedido en la sábana
aprobada o, sin sábana, lo que existe:

| Fase | Empieza | Termina |
|---|---|---|
| Planeación | Se crea la sábana (o su primer evento) | Queda aprobada, por el equipo o por el cliente |
| Copy | Se aprueba la sábana (o, sin ella, el primer copy guardado) | Cada línea de la sábana tiene aprobadas las piezas que pidió. Sin sábana: todo el copy guardado está aprobado |
| Producción | Se crea la primera pieza | Todas las piezas están listas y, con sábana, al menos todas las planeadas con diseño. Sin sábana, también tiene que haber terminado el copy |
| Aprobación final | El primer anuncio queda listo para aprobar: su pieza aceptada o, sin pieza, su copy aprobado | Todos los anuncios esperados están aprobados (por el cliente o por quien aprueba) |
| Montaje | La primera aprobación | Todos los anuncios esperados están montados |
| **Total** | La creación de la campaña, o su primera actividad si es anterior | El final de su flujo: todo montado si la marca tiene Implementación; si no, las piezas listas, o el copy aprobado si no hay piezas |

**Anuncios esperados:** el mayor entre las piezas pedidas en la sábana y los anuncios que Implementación ya muestra
para la campaña.

Mientras una fase no termina, cuenta hasta hoy, se marca «en curso» y muestra su avance («3 de 10»).

**Resumen por fase:**
- La **mediana** y el **p75** salen solo de las campañas que terminaron la fase.
- Al lado van **cuántas siguen abiertas** y **su edad mediana**. Si las abiertas llevan más tiempo que la mediana,
  las campañas lentas todavía no están en la cuenta y la mediana se ve mejor de lo que es.

## 4. Ajustes

| Lo pide el cliente | Lo hace el equipo |
|---|---|
| Sábana devuelta por el cliente | Sábana devuelta por el equipo |
| Copy con cambios: uno por pieza y por ronda, no por texto (10 títulos de Google rechazados son un pedido) | Copy con la aprobación quitada (por pieza) |
| Piezas devueltas por el cliente (rondas de antes del 24-nov) | Copy editado después de aprobado (sin contar el paso a pendiente al mandarlo al cliente) |
| Cambios antes de publicar (aprobación final) | Piezas devueltas por el equipo · Novedades al montar |

Las versiones de la sábana, las rondas de copy con el cliente, las versiones de arte y las generaciones se muestran
aparte, como volumen.

## 5. Gasto de IA por campaña

**Gasto por campaña:** copy (`GenerationLog` del brief) + auditoría de sus piezas + **refinar** + **generaciones que
fallaron**. Las dos últimas se registran desde el 2026-11-26 en `ConsumoIa` con su `projectId`. Antes de esa fecha no
existen y no se pueden reconstruir.

Lo que es de la marca y no de una campaña (la entrevista del ADN, el manual en PDF, «¿No suena a la marca?», el
fingerprint) entra en Gasto de IA, pero no en el costo de cada campaña.

Una generación que el usuario corta (cierra la pestaña) se registra como siempre, con lo que alcanzó a gastar.

## 6. Uso

- **Activo:** hizo al menos un pedido ese día. No cuenta el sondeo automático de cada minuto («Por aprobar» y la
  bandeja): una pestaña abierta no es trabajo.
- **Acción:** un pedido que cambia algo (todo lo que no es GET): guardar, aprobar, generar, montar…
- **Lectura:** un pedido que solo consulta.
- **Área:** por la ruta.

  | Área | Rutas |
  |---|---|
  | Marca y ADN | `clients`, `dna-profiles`, `projects` |
  | CDM | `cdm` |
  | Copywriting | `generate`, `copy`, `saved`, `copywriting`, `presets`, `feedback` |
  | Aprobación | `review-sessions` |
  | Producción | `piezas` |
  | Implementación | `implementacion` |
  | Reportes | `campanas` |
  | General | Lo demás |

- **Adopción:** las personas activas en el periodo sobre las personas con acceso.
- **Promedio diario:** se calcula sobre los días hábiles.

**Cómo se guarda:** se suma en memoria y se graba cada minuto, y otra vez al apagarse el servidor. Un reinicio brusco
puede perder hasta un minuto de conteo. El registro empezó con el deploy del 2026-11-26: antes no hay datos.

## 7. Límites conocidos

- **Copy sin sábana.** Una alternativa guardada y nunca aprobada deja la fase abierta. Con sábana no pasa, porque se
  mide contra lo pedido.
- **Datos anteriores.** Los tiempos de campañas viejas dependen de los eventos que existían entonces. Por ejemplo, el
  historial de aprobaciones internas de copy (`EventoDeCopy`) existe desde el 2026-11-24.
- **Uso sin tiempo.** Uso cuenta pedidos, no minutos frente a la pantalla. Para la línea base de horas-persona hace
  falta la fuente del proceso de antes (registro de horas, encuestas).
