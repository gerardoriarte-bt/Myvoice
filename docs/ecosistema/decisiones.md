# Decisiones

Registro con fecha. Lo decidido no se reabre sin una razón nueva; si se reabre, se agrega una entrada
nueva que diga qué cambió y por qué.

## 2026-10-28 · Revisión del plan del Adaptador de piezas

1. **CDM es Planning.** El «módulo Planning» de `docs/v2` es el CDM, una herramienta aparte. Los
   medios y formatos viven en CDM; My Voice **hereda** de cada formato lo que necesita para escribir
   (campos de texto y largos).
2. **Textos raíz y toolkit se mantienen**, solo dentro de My Voice. Aseguran la calidad del copy
   antes de escribir cada formato; no viajan a CDM.
3. **El responsable de la campaña aprueba**, y puede ser alguien de Planning o el ejecutivo de
   cuentas. **Cada aprobación queda en su herramienta.** Por eso la navegación y los avisos tienen
   que entenderse sin explicación.
4. **My Voice solo informa qué texto va en qué formato.** El Adaptador no se construye por ahora:
   es una fase 3 o 4.
5. **Se unifica el lenguaje** ([glosario.md](./glosario.md)): Estrategia (ADN), Planning (CDM).
   **Las audiencias se definen en el ADN y se seleccionan en la campaña**; lo que en el plan del
   Adaptador se llamaba audiencia es la segmentación de pauta. **La referencia es un campo libre.**
6. **CDM y My Voice funcionan juntos y por separado**, y se itera de forma alterna: mejorar My Voice,
   construir CDM. Se sigue en esta carpeta, aparte de `docs/v2`.

## 2026-10-28 · Dónde nace la campaña y dónde queda Producción

7. **Marca, ADN y campaña son transversales.** Se crean una vez, en una parte común a las dos
   herramientas, y **el usuario decide cómo sigue la campaña**: por CDM (armar el cuadro primero) o
   directo a My Voice (brief y textos raíz). Ninguna de las dos es la puerta obligatoria.
8. **Producción se queda en My Voice** (tablero de piezas, auditoría y aprobación del cliente).
   Probablemente se mude al Adaptador cuando exista. CDM muestra el estado de las piezas, no las
   aprueba.

## 2026-10-28 · Qué manda CDM y para quién se escribe

9. **CDM manda el encargo completo**: por línea, medio, formato (con sus campos de texto y su largo),
   **etapa del embudo**, cuántas variaciones y fechas. Pueden ser 10 o 200 líneas. Es lo que My Voice
   necesita para generar. La etapa **sale del cuadro**, no del brief.
10. **Las audiencias se eligen del ADN en la campaña, y cada línea se escribe para todas.** Es una
    decisión estratégica de la campaña, no de cada línea. Por eso desaparece el **frente**
    (audiencia × etapa): los textos raíz se organizan **por etapa**, y las etapas que hacen falta son
    las que trae el cuadro. Lo que `docs/v2` dice de frentes queda reemplazado por esto.
11. **El formato fija el largo máximo.** Una propuesta puede ser más corta, nunca más larga: pasarse
    bloquea la aprobación. Si un texto corto está bien o no, lo decide quien revisa; el mínimo, si un
    formato lo trae, es orientación y no bloquea.

## 2026-10-28 · Una sola plataforma

12. **Una plataforma con módulos separados**: un repositorio, una base, un login y un despliegue.
    Módulos: **parte común** (marca, ADN, audiencias, campaña, usuarios y funciones, avisos y cola),
    **My Voice** y **CDM**. Fronteras estrictas: cada módulo tiene su carpeta y sus tablas, no lee las
    tablas de otro y le habla solo por el contrato; una regla de CI prohíbe importar código entre
    módulos. «Funcionar por separado» se decide **por marca** (qué módulos tiene encendidos), no por
    despliegue. El **Adaptador**, cuando llegue, va como servicio aparte que usa el login y la parte
    común.
    - Por qué: la marca transversal, la tenencia (ya probada con `verify:isolation`), las funciones y
      los avisos existen una sola vez; avisos y cola únicos cumplen «un aviso lleva a la acción».
    - Lo que se paga: un error de un módulo puede afectar al otro (se despliegan juntos); se mitiga
      con el interruptor por marca y la CI.
    - Lo que exige primero: **rutas y un marco común en el frontend** (hoy no hay enrutador y
      `App.tsx` concentra el estado). Es lo primero que se diseña.

## 2026-10-28 · Dónde se construye lo nuevo

13. **Lo nuevo se construye en otra zona del mismo repositorio, sin sobreescribir el My Voice que se usa
    todos los días.**
    - Carpetas nuevas: `server/src/comun/`, `server/src/myvoice/` (lo nuevo), `server/src/cdm/` y
      `src/plataforma/`. Lo de hoy queda donde está y sigue en producción.
    - Una **marca piloto** ve el marco nuevo, detrás del interruptor por marca; las demás, la app de hoy.
    - **Se reemplaza de a una pantalla**: la vieja redirige a la nueva y se borra en el PR siguiente.
      Nunca hay dos versiones vivas de la misma pantalla para la misma marca.
    - **Ramas cortas sobre `main`**: cada PR deja `main` desplegable. Se deja de usar una rama larga de
      v2 en una copia aparte del repositorio.
    - Lo que mejora a los usuarios de hoy (manual de oficio, ADN 2.0) puede entrar antes que el marco.
    - Detalle: [tecnico/spec-plataforma.md](./tecnico/spec-plataforma.md) § 7.

## 2026-10-28 · El ADN manda y los medios vienen de CDM

14. **El ADN manda en la generación.** El front solo decide qué canales y para qué etapa (y qué brief).
    Todo lo demás sale del ADN de la marca y del brief, armado en el servidor. Hasta hoy el body del
    front se mezclaba encima y pisaba lo de la marca: la voz y la propuesta de valor de la marca, sus
    prohibiciones y keywords y los ejemplos de copy aprobado. Corregido en el PR «El ADN manda».
15. **Los medios y formatos vienen siempre de CDM, aunque la campaña sea chica.** No hay biblioteca
    propia en My Voice ni cuadro armado a mano dentro de My Voice: los 14 canales de hoy se cargan como
    formatos de la biblioteca de CDM, y toda campaña define su cuadro en CDM, aunque sean tres líneas.
    - Por qué: una sola fuente de medios y una trazabilidad clara de qué se encargó, dónde y cuándo.
    - Consecuencia: **My Voice necesita CDM encendido** para escribir por formato. CDM sí funciona solo.
    - Consecuencia: CDM necesita un **cuadro rápido** para campañas chicas, que se arme en minutos.
    - Transición: los 14 canales siguen en código (`server/src/channels/specs/`) hasta que estén cargados
      en la biblioteca de CDM; después el motor los lee de ahí.
    - **Con el flujo de Planning (2026-11-17, decisiones 19 y 20)**: los 14 canales son el medio «Canales
      propios» del catálogo (pantallas B6 y B7 del mapa) y se pasan una sola vez (B8). El «cuadro rápido» ya
      no es otra pantalla: es el mismo planning (P2 → P3 → P4) con los medios de la marca ya marcados. Y
      My Voice deja de elegir el medio en Generar: recibe un pedido de copy por línea de la sábana aprobada.

## 2026-10-28 · La marca primero, y la submarca hereda

16. **La submarca hereda de su marca madre, por capas y en vivo, no por copia.** Reemplaza a «la
    relación solo ordena» de `docs/plan-marcas-relacionadas.md` (2026-10-13), que era el alcance de
    aquel arreglo y no una regla de fondo.
    - **Prohibiciones y reglas de marca** (legales, logo, palabras vetadas): siempre heredadas; la
      submarca puede sumar, nunca quitar.
    - **Keywords, audiencias y paquetes de formatos**: heredados, y la submarca suma los propios.
    - **Tono, propuesta de valor, público y voz**: por sección, «igual que la madre» o «propio».
    - **Equipo**: quien trabaja la madre ve sus submarcas; se pueden sumar personas.
    - **Campañas**: no se heredan; cada una es de una marca concreta.
    - **Se ve el origen** en cada sección («de Terpel» o «propio»); lo heredado se edita en la madre.
    - **Un cambio en la madre** llega a todas sus submarcas, con un aviso de a cuántas afecta.
    - **Cada campaña fija la versión del ADN** con la que arrancó: las activas no cambian solas (cierra
      la pregunta abierta 7).
    - **La completitud cuenta lo heredado**: una submarca nueva solo completa lo propio.
    - **Un solo nivel**: madre → submarca, como hoy.
    - El motor recibe el ADN **resuelto** (madre + submarca) desde una sola función de la parte común.
17. **Se construye en orden, empezando por la marca**: marca → ADN y audiencias → formatos de la marca
    (paquetes) → campaña → CDM (biblioteca, cuadro) → My Voice. Los **paquetes de la marca** son el
    filtro que mantiene usable una biblioteca de 60 a 80 medios: cada marca trabaja sobre su recorte.
    Las 6 cantidades pendientes de la carga de los 14 canales esperan a la etapa de CDM.
    - Por ahora **solo LoBueno crea marcas**; cada marca ya pertenece a un workspace, así que abrir
      otras empresas después no obliga a rehacer nada.

## 2026-11-17 · La biblioteca se organiza por pieza a producir

18. **La unidad de la biblioteca es la pieza maestra**: un tipo de archivo y una proporción (imagen 9:16,
    video 4:5…), con las ubicaciones que cubre. Diseño produce por proporción y Planning planea por
    ubicación: las 34 ubicaciones de Meta (decía 33: error de conteo, corregido el 2026-11-19) quedan en 6 piezas
    ([cdm/biblioteca/meta.md](./cdm/biblioteca/meta.md)). El largo de cada texto lo fija la **línea del
    cuadro**: el más corto entre las ubicaciones que eligió, no entre todas las de la pieza. Una ubicación
    con alerta de la guía queda «por confirmar». Fuente: la planilla de Meta del 2026-11-09, versionada en
    el repo.

19. **Una línea de la sábana es un formato en una etapa.** Planning elige medios con casillas y, en cada
    formato, para qué etapas va y cuántas piezas por etapa: la etapa multiplica las piezas, y cada línea le
    dice a Diseño qué producir y para qué (Video 9:16 · Reconocimiento · 3 y Video 9:16 · Consideración · 2
    son 5 piezas, con mensajes distintos). Planning ve las **medidas**; zona segura, archivo y peso son de
    Producción. My Voice recibe un pedido de copy por línea.

20. **El menú de CDM sigue el trabajo, no el modelo de datos.** Arriba «Nuevo planning» y **Trabajo**:
    los plannings de la marca activa, por estado (en armado, por aprobar, aprobados). Abajo
    **Configuración**, lo que se prepara una vez: los **medios de la marca** (antes «paquetes») y la
    **biblioteca de medios** (medios, borradores y carga desde planilla pasan adentro). Se quita
    «Portafolio»: lo cubren la lista de plannings y Mi cola. «Cuadro de materiales» pasa a llamarse
    **planning**, y su resumen, **sábana**: son las palabras del equipo.
    El menú destaca solo lo que pide atención: **por aprobar** (con aviso) y **aprobados**; empezar un
    planning ya es armarlo, así que «en armado» no es un estado propio. La biblioteca abre con el
    **catálogo de medios** y cada medio lleva su **guía visual para Diseño**.

21. **El encabezado es el proceso: marca → CDM → My Voice.** El selector de marca va primero y los
    módulos se leen en orden, numerados: ① Marca · ADN › ② CDM · Planning › ③ My Voice · Copy. Un paso
    hecho lleva ✓; el que todavía no se puede abrir lleva candado y dice qué falta («Completa el ADN de
    Terpel», «Espera la sábana aprobada»). No hay CDM sin marca ni copy sin CDM. My Voice se entera del
    trabajo que llega de CDM por la campana, Mi cola y el correo (a quien tiene la función Copy en la marca
    y al responsable de la campaña), y su menú abre con **Pedidos de copy**.

22. **Cada uno entra a su entorno y ve el resto en lectura.** La función decide dónde entra cada persona y
    qué puede hacer: Estrategia → Marca · ADN; Planning → CDM · Plannings (y la biblioteca); Copy → My
    Voice · Pedidos de copy; Diseño → Producción · Lo mío; Aprobación → Mi cola. Los otros pasos se abren
    en **solo lectura** (sin botones de acción, con una franja que lleva de vuelta a su entorno). Un admin
    (OWNER o ADMIN) puede actuar en cualquier paso, para destrabar si alguien falta: es lo que conserva el
    espíritu de D2. Los clientes no entran; ven lo suyo por enlace.
    - Cambia D2 («ninguna función restringe nada»): ahora la función restringe **actuar**, no **ver**.
    - En código faltan las funciones `PLANNING` y `ESTRATEGIA` en `FuncionEquipo`, la entrada por función y
      el modo lectura. Diseño en el `.pen`: «§ Quién ve qué».

23. **Producción es un paso del proceso, no una pantalla de My Voice.** El proceso queda en cinco pasos:
    ① Marca · ADN › ② CDM · Planning › ③ My Voice · Copy › ④ Producción · Piezas › ⑤ Implementación ·
    Anuncios. Producción junta lo que viene de CDM (medio, formato, medidas, guía visual) y de My Voice (copy
    aprobado), así que no vive dentro de ninguno de los dos: tiene su propio menú (Lo mío, Por revisar, Por
    marca, Con el cliente, Listas para montar, Guías de la biblioteca) y Diseño entra a ④ Producción · Lo mío.
    El menú de My Voice deja de tener «Producción».
    - **El encabezado se parte en dos filas**: arriba lo que es de la persona y no cambia (identidad, marca,
      buscar, Mi cola, avisos, cuenta); abajo el proceso de la campaña que está viendo, que abre con la
      campaña.
    - **Producción e Implementación avanzan por línea**: el paso muestra cuánto lleva («6 de 17 piezas»), no
      un candado de todo o nada.
    - La regla de quién decide no cambia (`permisosPieza.ts`): acepta o devuelve el responsable, nunca quien
      subió.
    - **Siempre se sabe dónde se está: marca y campaña.** La marca va en la fila de arriba; la **campaña abre
      el subencabezado** y manda en todo lo que está debajo. Con varias campañas a la vez, el selector dice
      en qué paso va cada una. Las listas que cruzan campañas dicen «Todas las campañas», y la configuración
      (biblioteca, medios de la marca, ADN), «Ninguna · configuración de la marca».
    - **Destinos y UTM tiene entrada propia en el menú de CDM** (Trabajo): se elige la campaña y se pegan por
      línea, cuando sea, desde que la sábana está aprobada; no hace falta esperar a que estén las piezas.

## 2026-11-17 · Lo que dejó la auditoría de UX del diseño

Una revisión independiente del `.pen` encontró que cada pantalla se entiende sola, pero el marco que dice
dónde se está (marca, campaña, paso) se contradecía entre pantallas. Gerardo decidió:

24. **En la plataforma solo entra la agencia; la marca aprueba por enlace.** Quien aprueba es el
    **responsable** de la campaña (agencia, dentro de la app) o el **cliente** (la marca, por enlace, sin
    cuenta), según el modo de aprobación de la campaña (`INTERNA` | `CLIENTE`), igual para la sábana, el
    copy y las piezas. Dos nombres, nunca mezclados: «Responsable» y «Cliente».
    - **La campaña se crea primero y el planning de medios se hace sobre ella.** Un planning es la etapa
      CDM de una campaña, no otra cosa con nombre propio: se crea la campaña en un solo lugar («Nueva
      campaña», en el selector de campaña) y CDM la planea. El formulario del planning no vuelve a pedir el
      nombre.
    - **Con «Todas las campañas» los pasos del subencabezado solo navegan**: sin ✓, sin avance, sin candado.
      Con una campaña, el resaltado dice **dónde estás** y el ícono y el avance dicen **cómo va la
      campaña**; un paso con líneas pendientes nunca lleva ✓ («6 de 17 piezas»).
    - **Hay una sola marca activa en pantalla.** Al abrir algo de otra marca (desde Mi cola, un aviso o una
      lista que cruza marcas), la app cambia de marca y campaña y lo avisa; si en esa marca no hay nada en
      curso, lo dice. Se quita el chip «Estás en X · cambiar» del cuerpo: era un segundo selector.
    - **Todo el manejo del copy es de My Voice.** Producción es el entorno de Diseño: muestra el copy
      aprobado en lectura y, si una pieza vuelve por el texto, el arreglo se hace en My Voice y la pieza lo
      recibe. Copy puede aprobar, pero no edita dentro de Producción. Cambia lo que hoy hace
      `corregir-copy` dentro de la pieza.
    - **Falta una vista que vea todo: el Panorama.** Para el admin (OWNER o ADMIN) y la dirección de la
      agencia: todas las marcas y campañas en curso, en qué paso va cada una, qué está trabado y quién lo
      debe. Es su entrada por defecto. Diseño en el `.pen`.

## 2026-11-17 · La biblioteca es de la agencia

25. **La biblioteca de medios es de la agencia, no de una marca.** Todos los medios y formatos están
    disponibles para todas las marcas; lo que se agrega o cambia en la biblioteca queda para todas. Cada
    marca solo **elige** los suyos («Medios de Terpel»): no hay formatos propios de una marca. Si a una marca
    le falta un formato, Planning lo agrega a la biblioteca —con aviso de que queda para todas— y vuelve
    elegido para esa marca. La gestiona **Planning**, que es quien mantiene los medios; no hace falta un
    admin.
    - En el menú de CDM la biblioteca va en su propio grupo, **De la agencia**, separada de **De la marca**;
      sus pantallas llevan la franja «Biblioteca de la agencia: la comparten todas las marcas» y la campaña
      dice «Ninguna · biblioteca de la agencia».
    - El medio que agrupaba email, push, WhatsApp y web se llama **CRM y web**: «Propios de la marca» se
      leía como formatos de una sola marca.

## 2026-11-17 · Una sola forma de moverse

26. **Los cinco pasos se navegan igual.** Lo que dejó el resto de la auditoría de UX:
    - **Un solo patrón de menú lateral**: el paso arriba («② CDM · Planning»), **Trabajo**, **Seguimiento** y,
      si hace falta, la configuración o referencia (De la marca, De la agencia, Referencia), con una ayuda
      corta al pie. El menú del paso ① Marca es el de Inicio de la marca.
    - **Lo que es de la persona o de la agencia va en el menú de la cuenta** (el avatar): Panorama, Equipo y
      funciones, Configuración de la agencia (estas tres, solo OWNER/ADMIN), Guía, Novedades y Salir. No va
      en el menú de ningún módulo.
    - **Al cambiar de campaña te quedas en tu entorno**: si la campaña no llegó a tu paso, la pantalla lo
      dice en vez de llevarte a otro. El selector muestra, por campaña, en qué paso va y **lo tuyo**.
    - **Todo detalle tiene «← volver» a su lista** (D2 ← Lo mío, T2 a T4 ← Por montar, MV2 ← Copy por
      aprobar…), y Mi cola, Inicio de la marca y el Panorama muestran el avance con los mismos cinco pasos.
    - En la revisión de una pieza, cada hallazgo se marca «pedir cambio» o «aceptar así», y un solo
      **Devolver** manda todos los cambios juntos.

## 2026-11-19 · Un super admin por encima de todo, y los costos solo para él

27. **El super admin controla los interruptores, los usuarios y el gasto de IA, y es el único que ve costos**
    (Gerardo, 2026-11-19).
    - **Es global, no un rol de workspace.** Es `User.superAdmin`. Ve y controla todas las empresas aunque no
      sea miembro, y el servidor lo verifica en la base en cada ruta (`requireSuperAdmin`, que responde 404 a
      quien no lo es).
    - **Lo nombra un script**, `npm run superadmin`, nunca la pantalla: nadie se nombra desde la app, ni otro
      super admin.
    - **Su pantalla es Control** (en el `.pen`, «§ Marco · Control»). Está en el menú de la cuenta y tiene
      tres pestañas:
      - Workspaces: el interruptor de la plataforma por procesos, personas y marcas, gasto del mes contra
        la cuota.
      - Usuarios: todas las personas con su rol en cada empresa. Desde ahí se cambia el rol, se saca a
        alguien de un workspace o se lo agrega. Un workspace nunca se queda sin OWNER.
      - Gasto de IA: el detalle por marca, modelo y etapa.
    - **Los costos no se ven en ningún otro lado, para nadie más, OWNER incluido.** El servidor deja de
      mandarlos en:
      - la generación (el evento `usage`)
      - el Historial
      - el informe de auditoría de una pieza
      - el Excel exportado

      Métricas queda con la aprobación. El aviso de cuota dice «llegó al tope de IA de su plan», sin montos.
      Se siguen registrando igual: solo cambia quién los ve.

## 2026-11-19 · Lo que quedaba abierto de la arquitectura de datos

28. **Cinco respuestas para la base de F2 a F5** (Gerardo, 2026-11-19; detalle en
    [datos/arquitectura-de-datos.md](./datos/arquitectura-de-datos.md)):
    - **La biblioteca es general**, de la agencia, para todas las marcas. El caso Terpel, si tiene workspace
      propio o necesita algo suyo, se plantea con Terpel antes de F2.
    - **El historial de aprobaciones es una vista de lectura** que une lo que ya existe (copy, piezas,
      portal), sin tabla nueva: lo más simple mientras nadie pida otra cosa.
    - **El brief de v1 (`ContentDNAProfile`) se deja de escribir** cuando la campaña nace desde Planning
      (F3). No le aporta al ADN 2.0, y queda solo para leer lo histórico.
    - **Sin CDM, el anuncio cuelga de la pieza**, con `lineaId` vacío.
    - **`schema.prisma` se parte por módulo al empezar F2**, antes de sumar las tablas de CDM.

## 2026-11-19 · Cuatro clases de medio, un solo proceso

29. **Los medios se organizan en cuatro clases y el proceso es el mismo para todas** (Gerardo, 2026-11-19):

    | Clase | Medios | En Implementación (⑤) |
    |---|---|---|
    | **Pagos** | Meta Ads, Google (búsqueda y display), TikTok Ads, programática | el trafficker **monta** |
    | **Redes sociales** (orgánico) | Instagram (post, historia, carrusel, reel), TikTok, YouTube | el community manager **publica** |
    | **Propios** | Email, WhatsApp, push, pop up web, rich media | se **programa** en el CRM de la marca |
    | **Tradicional** | Radio, exterior | se **entrega** al medio |

    - **Meta es Meta Ads** y tiene sus 6 piezas maestras (decisión 18). Las publicaciones de Instagram son otro
      medio, en Redes sociales. Así se resuelve el choque de B8: los 14 canales de My Voice van a su clase y no
      se mezclan con las piezas de Meta.
    - **Lo orgánico lo publica el community manager**, una función nueva en Equipo (`COMMUNITY`). El paso ⑤ es
      el mismo y cambia la acción según la clase.
    - **La sábana mezcla clases** y agrupa sus líneas por clase. El flujo no cambia: planning → copy → pieza →
      implementación.
    - **En la base:** `Medio.clase` (`PAGOS`, `REDES_SOCIALES`, `PROPIOS`, `TRADICIONAL`). La biblioteca agrupa
      y filtra por clase.

## 2026-11-20 · Varios aprobadores y «Por aprobar» siempre a la vista

30. **Una campaña puede tener varios aprobadores, y lo que te toca aprobar está siempre a la vista** (Gerardo,
    2026-11-20). Surgió al probar F3b: Gerardo tenía la función Aprobación, pero no encontraba dónde aprobar,
    porque la sábana la aprueba el responsable de la campaña y el aviso nunca le llegó.
    - **Aprobadores sumados.** Además del responsable, se pueden sumar aprobadores. Cualquiera de ellos decide
      la sábana, el copy y las piezas, y decide el primero que lo haga; el historial dice quién fue. Los suma
      quien administra o quien ya aprueba, para no depender de un admin en una urgencia. Solo personas del
      workspace. La regla vive en un solo lugar (`server/src/comun/aprobadores.ts`).
    - **«Por aprobar · N»** está en el encabezado de todas las pantallas, junto a la campana y en los dos
      marcos. Lista lo que espera tu decisión: sábanas por aprobar, copy pendiente de campañas internas y
      piezas por revisar. Cada fila lleva a donde se decide. Los avisos siguen, pero ya no son el único camino.
    - **La función «Aprobación» es la lista de elegibles** (resuelve la pregunta 10, Gerardo, 2026-11-20). Solo
      quien la tiene, para esa marca o para todas, se puede elegir como responsable o sumar como aprobador. Si
      en el workspace nadie la tiene, se puede elegir a cualquiera, como antes. Los responsables que ya están
      no se tocan. `elegiblesPara` en `comun/aprobadores.ts`.
    - **En la base:** `AprobadorDeCampana(projectId, userId, agregadoPorId)`, en la parte común.
    - **Cambio del 2026-11-23 (Gerardo): los permisos se manejan desde Equipo.**
      - Ya no se suman aprobadores por campaña. Aprueban el responsable y quienes tienen la función
        **Aprobación** para la marca de la campaña, o para todas.
      - En la campaña solo se elige el responsable, entre quienes tienen Aprobación. Quién más aprueba se
        muestra, pero no se edita.
      - `AprobadorDeCampana` queda sin uso y se borra en una migración posterior.
      - Si nadie tiene Aprobación, aprueba solo el responsable.

31. **El paso ③ se llama Copywriting, y la sábana aprobada le avisa** (Gerardo, 2026-11-20).
    - **El nombre:** el encabezado dice ① Marca › ② CDM › ③ Copywriting › ④ Producción. **My Voice sigue siendo el
      nombre de la herramienta**: el logo, los correos y la página de inicio no cambian. Las pantallas de CDM
      que hablaban del paso («Textos para My Voice») dicen Copywriting.
    - **El aviso:** cuando la sábana queda aprobada del todo (por el equipo o, en campañas «con cliente», por
      el cliente), quienes tienen la función Copy de esa marca reciben «Hay copy por escribir»
      (`PLANNING_PARA_COPY`), con aviso y correo que llevan a Generar. Si nadie tiene la función, le llega a quien
      administra. Es el puente hasta F4, cuando la sábana se convierte en pedidos de copy con su largo.

## 2026-11-24 · La aprobación final es antes de implementar

32. **Nada se monta sin la aprobación final, y la del cliente es una sola, con todo** (Gerardo, 2026-11-24).
    - **Por qué.** El cliente aprobaba el arte en una ronda de Producción, aparte del copy, del destino y de las
      fechas. Lo que de verdad aprueba es lo que va a salir: el arte con su copy y su caption, adónde lleva y cuándo.
    - **Se quita la ronda de piezas.** Producción termina en «Lista» también en las campañas «con cliente». La
      columna «Con el cliente» y «Mandar al cliente» desaparecen; las piezas que estaban ahí pasaron a Lista en la
      migración. El portal sigue mostrando las sesiones de piezas que ya existían.
    - **Según la campaña** (`Project.modoAprobacion`):
      - **Con cliente:** en Implementación › Por aprobar, «Crear enlace para el cliente» junta en un solo enlace
        todo lo listo de la campaña (con destino y fecha). El cliente ve, por medio, cada anuncio con su arte, los
        textos (en la pieza y los que la acompañan), adónde lleva y cuándo sale, y aprueba o pide cambios de a uno.
        Lo aprobado queda «por montar»; lo que pide cambios vuelve a «por aprobar» con su comentario, y el
        responsable recibe un aviso. El enlace lo crea quien aprueba la campaña o quien administra; si hay uno
        abierto, se reusa.
      - **Interna:** «Autorizar implementación» lo toca quien aprueba la campaña (el responsable o la función
        Aprobación). Aparece también en «Por aprobar» del encabezado.
    - **Estados del anuncio:** por aprobar → (con el cliente) → por montar → montado, o con novedad. Reabrir o
      devolver no salta la aprobación.
    - **Pendiente:** si el copy o el arte cambian después de aprobados para implementar, todavía no vuelven solos a
      «por aprobar» (va con «un cambio después de montado», F5).

## Antes (2026-10-27), siguen vigentes con los nombres nuevos

- La marca, su ADN y sus audiencias son la fuente de verdad (ahora en la parte común, decisión 7).
- Planning no ve los textos raíz.
- El cuadro trae cuántos copys distintos, no frecuencia ni presupuesto.
- Carruseles: el cuadro dice cuántas láminas; un texto por lámina o un relato repartido se decide en
  la campaña.
- Un formato separa medidas, campos de texto y archivo; la biblioteca se ordena por medio.
- Un medio en borrador no se puede usar en un cuadro.
- La IA sugiere, el equipo decide.

## Preguntas abiertas

| # | Pregunta | Por qué importa |
|---|---|---|
| 8 | ¿Cómo se revisan 200 líneas? Propuesta: generar por tandas según fecha de salida, revisar agrupado por etapa y formato, y **aprobar por muestra** (una de cada grupo; el resto queda aprobado si pasa todos los controles; lo que se pasa del largo o tiene problemas se revisa siempre de a uno). | Revisar de a uno, como está diseñado, sirve para 10 líneas, no para 200. |
| 9 | Si la campaña sigue directo a My Voice, sin cuadro todavía, ¿para qué etapas se escriben los textos raíz? Propuesta: el brief puede marcar etapas previstas, y el cuadro de CDM las confirma o agrega. Las adaptaciones esperan al cuadro (decisión 15). | Con la decisión 9 la etapa sale del cuadro, pero la decisión 7 permite empezar por My Voice. |
