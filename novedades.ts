/**
 * Las novedades del producto: lo que cambió, cuándo y por qué.
 *
 * Es el único lugar donde se escriben. Alimenta dos cosas:
 *
 * - la pantalla «Novedades», el registro completo, de lo más reciente a lo más
 *   viejo. No está en el menú por etapas porque no es un paso del proceso: se
 *   llega por un enlace chico al pie de la barra lateral;
 * - el aviso al iniciar sesión, solo para las entradas con `aviso`. Cada
 *   persona lo ve una vez (lo visto se guarda en `User.novedadesVistas`) y solo
 *   si ya usaba la herramienta antes de esa fecha: a quien llega después,
 *   «ahora cambió» no le dice nada.
 *
 * Una entrada por cambio que alguien note al usar la herramienta. Lo interno
 * —migraciones, scripts, refactors— no va: para eso están los commits.
 * El `id` no se cambia una vez publicado: es lo que se guarda como visto.
 */

import type { ScreenId } from './screens';

export interface PasoDelAviso {
  /** Título del recuadro de pasos. */
  titulo: string;
  pasos: string[];
  /** El botón principal: lleva a donde se hace lo que pide. */
  accion: { label: string; pantalla: ScreenId };
}

export interface Novedad {
  id: string;
  /** ISO, YYYY-MM-DD. El día en que llegó a producción. */
  fecha: string;
  titulo: string;
  /** Lo que se ve en la pantalla Novedades: corto, en lo que la persona nota. */
  cambios: string[];
  /** Si existe, la novedad se avisa al iniciar sesión. */
  aviso?: {
    porQue: string;
    /** Para quien administra el workspace (OWNER o ADMIN). */
    paraQuienAdministra: PasoDelAviso;
    /** Para el resto del equipo. */
    paraElEquipo: PasoDelAviso;
    tambien: string[];
    /** La sección de la Guía donde está el detalle. */
    guia?: string;
  };
}

export const NOVEDADES: Novedad[] = [
  {
    id: 'adn-esencial-con-ia',
    fecha: '2026-11-25',
    titulo: 'Lo esencial del ADN, obligatorio y con ayuda de la IA',
    cambios: [
      'Para generar copy, la marca necesita completas sus secciones esenciales (★): propuesta de valor, audiencias, voz, tratamiento y prohibiciones. Generar te dice cuáles faltan.',
      '«Completar con IA», en Marca › ADN: respondes unas preguntas cortas y la IA redacta cada sección. Tú la apruebas, la corriges o la descartas; nada entra sin tu aprobación.',
      'El manual en PDF también propone en vez de escribir directo en el ADN.',
    ],
  },
  {
    id: 'de-donde-sale-el-copy',
    fecha: '2026-11-25',
    titulo: 'De dónde sale cada texto, y cómo mejorarlo',
    cambios: [
      'Arriba de lo generado, «De dónde sale» muestra las secciones del ADN que guiaron el copy y cuáles están débiles o vacías.',
      'Cada alerta dice de qué sección viene (por ejemplo, «Tono distinto · Voz y personalidad») y te lleva a ella.',
      '«¿No suena a la marca?», en cada texto: cuéntale a la IA qué está mal y te propone cómo corregir el ADN. Tú lo apruebas.',
    ],
  },
  {
    id: 'mi-cola',
    fecha: '2026-11-25',
    titulo: 'Mi cola: lo que te toca, en todas las marcas',
    cambios: [
      'En Implementación, «Mi cola» junta lo que te toca en todas las marcas: montar o publicar lo aprobado, autorizar lo listo de tus campañas y corregir lo devuelto con novedad.',
      'Va por fecha de salida, con lo atrasado arriba. Cada anuncio se abre ahí mismo, sin cambiar de marca.',
    ],
  },
  {
    id: 'campanas-a-la-vista',
    fecha: '2026-11-24',
    titulo: 'Crear una campaña, a un clic',
    cambios: [
      '«+ Nueva campaña» está en el selector de campaña, arriba, desde cualquier pantalla. Y Marca tiene su pantalla «Campañas».',
      'Una campaña y su brief son lo mismo: apenas la creas aparece en el selector, en CDM («Nuevo planning») y en Copy, con un solo nombre.',
      'Las campañas que no tenían brief aparecen en Marca › Campañas con «Completar el brief».',
      'El ADN está en un solo lugar, Marca › ADN, con el manual en PDF y el Voice Fingerprint. En el brief, el léxico y los ejemplos son solo los de esa campaña.',
    ],
  },
  {
    id: 'ahora-y-quien',
    fecha: '2026-11-24',
    titulo: 'Siempre sabes qué sigue y a quién le toca',
    cambios: [
      'Con una campaña elegida, arriba aparece «Ahora»: en qué paso va, qué falta y quién lo tiene, con nombre. Si te toca a ti, se ve en ámbar, con un botón para ir.',
      'En Implementación, cada anuncio dice su siguiente paso: quién lo autoriza o le manda el enlace al cliente, y quién lo monta o lo publica. Si te toca, el botón está ahí mismo.',
      'Anuncios muestra solo la campaña elegida y abre en la pestaña que tiene trabajo. En Copy, lo pendiente nombra a todos los que pueden aprobarlo.',
    ],
  },
  {
    id: 'reporte-implementacion',
    fecha: '2026-11-24',
    titulo: 'El reporte de implementación',
    cambios: [
      'En ⑤ Implementación › Reporte, cada campaña muestra lo planeado en la sábana contra lo montado, línea por línea: qué falta, qué salió tarde, qué tiene novedad.',
      'Abajo, todas las aprobaciones de la campaña en orden —sábana, copy, piezas y la aprobación final—, del equipo y del cliente.',
      'Se descarga en Excel o se imprime como PDF para mandárselo al cliente.',
    ],
  },
  {
    id: 'no-lleva-destino',
    fecha: '2026-11-24',
    titulo: '«No lleva destino»: lo que no tiene URL se marca',
    cambios: [
      'Cada anuncio necesita su URL de destino o la marca «No lleva destino» (una publicación orgánica, un push sin enlace). Sin ninguna de las dos, no se puede aprobar para implementar.',
      'Se marca en la sábana, junto al destino de cada línea, o en Implementación, en el anuncio.',
    ],
  },
  {
    id: 'copy-siguiente-paso',
    fecha: '2026-11-24',
    titulo: 'Copy dice qué sigue después de aprobar',
    cambios: [
      'Lo aprobado que lleva arte muestra «Siguiente paso: mandar a producción», con el botón a la mano.',
      'Lo que no lleva arte (búsqueda de Google Ads, WhatsApp, push) aparece como «Directo a Implementación»: no pasa por Producción y se aprueba y monta allá.',
    ],
  },
  {
    id: 'juntar-en-un-anuncio',
    fecha: '2026-11-24',
    titulo: 'El copy anterior se junta en un anuncio',
    cambios: [
      'El copy aprobado de antes de las piezas (Google Ads, WhatsApp, push) no pasaba a Implementación porque no se sabía qué textos iban juntos.',
      'Ahora la fila lo avisa: selecciona los textos de cada anuncio en Copy y toca «Juntar en un anuncio». Desde ahí pasan solos.',
    ],
  },
  {
    id: 'aprobacion-final',
    fecha: '2026-11-24',
    titulo: 'El cliente aprueba una sola vez, antes de implementar',
    cambios: [
      'En Implementación, lo listo de cada campaña espera la aprobación final en «Por aprobar». Nada se monta sin ella.',
      'Si la campaña es con cliente, «Crear enlace para el cliente» le manda todo junto: el arte con su copy y su caption, adónde lleva y cuándo sale. Lo que aprueba pasa a «Por montar»; lo que no, vuelve con su comentario.',
      'Si la campaña la aprueba el equipo, quien la aprueba toca «Autorizar implementación». También aparece en «Por aprobar», arriba.',
      'Producción termina en «Lista»: ya no hay columna «Con el cliente» ni se mandan piezas sueltas al cliente.',
    ],
  },
  {
    id: 'implementacion-solo-texto',
    fecha: '2026-11-24',
    titulo: 'Los anuncios de solo texto también se montan',
    cambios: [
      'Los anuncios de búsqueda de Google Ads, WhatsApp y push no tienen pieza de diseño. Ahora, apenas se aprueba su copy, llegan a Implementación › Por montar, con sus textos y el destino de la sábana.',
      'En Implementación, el community manager ve y publica lo de redes sociales («Marcar publicado») y el trafficker monta los pagos y lo demás. Quien administra ve todo.',
    ],
  },
  {
    id: 'implementacion',
    fecha: '2026-11-23',
    titulo: 'Implementación: montar lo aprobado y dejar constancia',
    cambios: [
      'En las marcas con Implementación prendida aparece el paso ⑤. En «Por montar» están los anuncios listos de cada campaña.',
      'Cada anuncio trae sus textos con «Copiar», la URL con la UTM, el archivo y quién aprobó. Se marca montado (plataforma, ID y fecha) o se devuelve con una novedad, que le llega al responsable.',
      'Planning pega el destino y la UTM en cada línea de la sábana, aunque ya esté aprobada. Sin destino no se puede montar; sin UTM, solo avisa.',
    ],
  },
  {
    id: 'meta-ads',
    fecha: '2026-11-23',
    titulo: 'Los anuncios de Meta ya se escriben',
    cambios: [
      'Los pedidos de Meta (video e imagen, en sus proporciones) se escriben como los demás: texto principal, título y descripción.',
      'Cada texto sale con el largo que permiten las ubicaciones elegidas en la sábana; si la pieza no lleva descripción (por ejemplo, en Stories), no se escribe.',
      'Meta Ads también está en Generar suelto.',
    ],
  },
  {
    id: 'copy-genera',
    fecha: '2026-11-23',
    titulo: 'Quien escribe el copy ya puede generar',
    cambios: [
      'Quien tenga la función Copy para una marca puede generar: en Pedidos, dentro de cada pedido, y en Generar suelto. Antes solo podía quien administra.',
      'La función se da en Equipo, para una marca o para todas.',
    ],
  },
  {
    id: 'copy-carril-y-enlace',
    fecha: '2026-11-23',
    titulo: 'Copy: el flujo primero y el enlace para el cliente a la vista',
    cambios: [
      'En Copy, el carril del proceso (por aprobar, con el cliente, aprobado, en producción) es lo principal; toca un paso para ver solo ese.',
      'Con una campaña elegida, «Con el cliente» dice si la aprueba el equipo o el cliente. Si es el cliente, «Crear enlace para el cliente» está siempre a la vista; si es el equipo, «Que la apruebe el cliente» la cambia.',
      'Quién aprueba se maneja en Equipo: quien tenga la función Aprobación para una marca aprueba sus campañas. En la campaña solo se elige el responsable.',
      'Si el equipo ya había aprobado el copy y la campaña pasa a «la aprueba el cliente», «Mandarle al cliente lo aprobado» crea el enlace con ese copy. El enlace queda a la vista para copiarlo.',
      'Lo que ve el cliente en el enlace es más claro: la campaña y su objetivo, tres pasos para revisar, el copy ordenado por medio y cada pieza completa (un anuncio de Google Ads es uno, con sus títulos y descripciones). Aprueba o pide cambios por pieza.',
    ],
  },
  {
    id: 'pedidos-de-copy',
    fecha: '2026-11-20',
    titulo: 'Pedidos de copy: lo que pide CDM, por campaña y estado',
    cambios: [
      'En Copywriting está la pantalla Pedidos: cada línea de una sábana aprobada es un pedido, con su formato, su etapa, cuántas piezas y el largo de cada texto.',
      'Las pestañas Por escribir, En aprobación y Listos ordenan los pedidos; cada campaña muestra cuánto lleva listo.',
      '«Escribir» genera el pedido ahí mismo, en su tarjeta, con la voz del brief de la campaña y lo que pidió CDM: el medio, la etapa y cuántas piezas. Lo que guardes cuenta para ese pedido.',
      'Generar suelto queda para el copy que no viene de una sábana.',
    ],
  },
  {
    id: 'copywriting-y-aprobacion',
    fecha: '2026-11-20',
    titulo: 'Copywriting se entera de la sábana aprobada, y quién puede aprobar',
    cambios: [
      'Cuando una sábana queda aprobada, a quienes escriben el copy de la marca les llega «Hay copy por escribir», con aviso y correo.',
      'Para elegir el responsable o sumar un aprobador de una campaña, la persona tiene que tener la función Aprobación en Equipo.',
      'En el encabezado por procesos, el paso ③ se llama Copywriting.',
    ],
  },
  {
    id: 'por-aprobar-y-aprobadores',
    fecha: '2026-11-20',
    titulo: 'Lo que te toca aprobar, siempre a la vista',
    cambios: [
      'Arriba, junto a la campana, está «Por aprobar»: las sábanas, el copy y las piezas que esperan tu decisión, en todas las pantallas. Cada fila te lleva a donde se decide.',
      'Una campaña puede tener más de un aprobador. Si el responsable no está, quien administra o quien ya aprueba suma a otra persona con «Sumar aprobador», y decide el primero que lo haga.',
    ],
  },
  {
    id: 'modelos-claude-5-5',
    fecha: '2026-11-12',
    titulo: 'El motor escribe con una versión más nueva de Claude',
    cambios: [
      'Generar usa Claude Sonnet 5.5 para escribir y Haiku 5.5 para revisar y corregir.',
      'En las pruebas, el copy salió con la mitad de faltas al manual de oficio y la generación tardó cerca de un 40 % menos.',
      'Si notas algo distinto en el copy, para bien o para mal, cuéntaselo a quien administra: nos ayuda a confirmarlo con casos reales.',
    ],
  },
  {
    id: 'adn-2',
    fecha: '2026-11-12',
    titulo: 'El ADN de la marca, en diez secciones y con lo que le falta',
    cambios: [
      'En Marcas, cada marca tiene su pestaña ADN: diez secciones en tres grupos (qué decir, cómo suena, qué no se toca), cada una con su estado.',
      'Un anillo dice cuánto está completo el ADN. Para abrir campañas hace falta el 75 % y las secciones con ★.',
      'Secciones nuevas: productos y servicios, audiencias, así suena, frases que no se cambian y reglas de estilo.',
      'En una submarca, cada sección se elige «igual a la madre» o propia; prohibiciones, frases y keywords se suman a las de la madre.',
      'Si el ADN no llega al mínimo, Generar avisa qué falta. Por ahora se puede generar igual.',
    ],
    aviso: {
      porQue:
        'El copy sale tan bueno como lo que el motor sabe de la marca. Ahora el ADN dice qué le falta a cada marca y se completa sección por sección. Más adelante, una campaña nueva no se va a poder crear con el ADN bajo el mínimo.',
      paraQuienAdministra: {
        titulo: 'Lo que conviene hacer ahora',
        pasos: [
          'Abre cada marca en Marcas › ADN y completa lo que marca el anillo, empezando por las secciones con ★.',
          'Carga las audiencias de la marca: cada campaña va a elegir de esa lista.',
          'Si la marca tiene submarcas, di «Está bien» en cada sección y confirma el ADN para que lo hereden.',
        ],
        accion: { label: 'Ir a Marcas', pantalla: 'clients' },
      },
      paraElEquipo: {
        titulo: 'Qué cambia para ti',
        pasos: [
          'En Generar, si el ADN de la marca está incompleto, vas a ver qué le falta.',
          'Puedes generar igual: el aviso dice por qué el copy puede salir más genérico.',
        ],
        accion: { label: 'Ir a Generar', pantalla: 'generator' },
      },
      tambien: ['Las «guías de voz» de antes ahora son las notas de reglas de estilo.'],
    },
  },
  {
    id: 'piezas-por-medio',
    fecha: '2026-11-05',
    titulo: 'Un medio por vez, cuántas piezas y el carrusel como una historia',
    cambios: [
      'En Generar se elige un medio y cuántas piezas: «5 carruseles de 6 slides», «3 posts». Para otro medio se genera aparte.',
      'Cada carrusel cuenta una historia: una slide por texto, «Slide 1», «Slide 2»…, la primera engancha y la última cierra.',
      'Los posts de redes traen lo que va en la imagen y, aparte, el copy out que acompaña la publicación.',
      'En Copy, los textos de una pieza se ven juntos y se aprueban de una vez; en Producción, un carrusel es una sola pieza.',
    ],
  },
  {
    id: 'tratamiento-y-quien-aprueba',
    fecha: '2026-11-05',
    titulo: 'Tú, vos o usted, y quién aprueba siempre a la vista',
    cambios: [
      'Cada marca elige en su ADN si habla de tú, de vos o de usted, y el copy lo respeta. Antes el voseo se adivinaba y aparecía aunque se pidiera tutear.',
      'Cada pieza y cada copy por aprobar dicen quién lo aprueba, con su nombre y su correo, para escribirle y que avance.',
      'Si quien entregó la pieza es el responsable de la campaña, la aprueba cualquiera que administre el equipo. Antes quedaba trabada.',
      'Quien administra puede cancelar una pieza enviada por error: sale del tablero, queda en el historial y su copy vuelve a estar disponible.',
    ],
  },
  {
    id: 'submarca-hereda-adn',
    fecha: '2026-11-04',
    titulo: 'Las submarcas heredan el ADN de su madre',
    cambios: [
      'Antes de heredar, alguien que administra revisa el ADN de la madre sección por sección y lo confirma. Marcas y la campana avisan cuál falta.',
      'Con el ADN de la madre confirmado, la submarca suma sus prohibiciones y keywords: no puede quitarlas.',
      'Si una submarca no tiene voz, propuesta de valor o guías propias, el copy toma las de la madre. Con las suyas, mandan las suyas.',
      'Un cambio en el ADN confirmado de la madre llega a todas sus submarcas.',
      'Las campañas y aprobaciones siguen siendo de cada marca.',
    ],
  },
  {
    id: 'manual-de-oficio',
    fecha: '2026-11-04',
    titulo: 'El motor escribe con el manual de oficio',
    cambios: [
      'Todas las marcas se escriben con las reglas de oficio de Buentipo: afirmar en vez de dudar, sin grasa, sin relleno, sin manifiestos, y el titular construye el concepto.',
      'El motor ya no abre con «¿Sabías que…?» ni usa «de inmediato», y no repite la marca en el titular de una pieza que lleva el logo.',
      'Lo genérico ya no solo se marca: se reescribe antes de llegar a ti.',
      'Las marcas del editor se leen en castellano («Relleno», «Manifiesto», «Bonito pero no vende»).',
    ],
  },
  {
    id: 'adn-de-la-marca-manda',
    fecha: '2026-10-28',
    titulo: 'El copy respeta siempre el ADN de la marca',
    cambios: [
      'Al generar, la voz, la propuesta de valor y las guías de la marca ahora tienen prioridad sobre las del brief, como estaba pensado. Antes, si el brief traía las suyas, se usaban esas.',
      'Las prohibiciones y palabras clave de la marca se suman siempre a las del brief. Antes, si el brief tenía las suyas, las de la marca no llegaban al motor.',
      'El motor vuelve a aprender del copy aprobado de la marca: lo usa como ejemplo al escribir.',
    ],
  },
  {
    id: 'marcas-relacionadas',
    fecha: '2026-10-26',
    titulo: 'Marcas relacionadas, y el nombre repetido se nota',
    cambios: [
      'Una marca puede tener submarcas: «Terpel CRM» aparece debajo de Terpel en el selector y en Marcas, donde cada familia va en su propio bloque. Se agregan con «+ Submarca». Solo ordena; cada marca sigue con su ADN y sus campañas.',
      'Si dos marcas se llaman igual, el selector lo avisa y dice qué distingue a cada una. Se resuelve en Marcas, renombrando una o haciéndola submarca de la otra.',
      'Al crear una marca con un nombre que ya existe, la herramienta lo avisa antes de guardar.',
      'Si dos marcas eran la misma, se pueden fusionar desde Marcas: todo pasa a la que eliges y la otra se borra.',
    ],
  },
  {
    id: 'produccion-con-responsable',
    fecha: '2026-10-13',
    titulo: 'Producción: cada pieza la aprueba el responsable de su campaña',
    cambios: [
      'Acepta o devuelve una pieza el responsable de la campaña, y nunca quien la entregó. Los demás ven quién lo hace.',
      'Nueva columna «Con el cliente»: si la campaña es del cliente, la pieza aceptada lo espera ahí. Lista vuelve a ser el final.',
      'La pieza llega a revisión con la verificación terminada, y la tarjeta dice si fue devuelta, por quién y por qué.',
      'Un cambio de mensaje ya no deja la pieza varada: el responsable corrige el copy dentro de la pieza.',
      '«Mis piezas» ahora es «Lo mío»: suma lo que espera tu visto bueno.',
    ],
    aviso: {
      porQue:
        'Hasta ahora cualquiera del equipo podía aceptar una pieza, incluso quien la había diseñado, y la aprobación del cliente sobre el arte era un interruptor suelto. Ahora la pieza sigue la misma regla que el copy: la aprueba el responsable de su campaña, y el cliente la ve si la campaña es del cliente.',
      paraQuienAdministra: {
        titulo: 'Lo que cambia para quien administra',
        pasos: [
          'Revisa que cada campaña con piezas en curso tenga responsable: sin él, nadie puede aceptarlas.',
          'Si el responsable es también quien diseña, nombra a otra persona: nadie acepta lo que entregó.',
          'Las piezas de campañas del cliente que ya estaban enviadas pasaron a «Con el cliente».',
        ],
        accion: { label: 'Ir a Producción', pantalla: 'produccion' },
      },
      paraElEquipo: {
        titulo: 'Qué cambia para ti',
        pasos: [
          'Si diseñas: lo devuelto aparece primero en «Lo mío», con el motivo, y te llega un aviso.',
          'Si eres responsable de una campaña: aceptas, devuelves y corriges el copy de sus piezas.',
          'Si no te toca decidir, la tarjeta te dice quién lo hace en lugar de los botones.',
        ],
        accion: { label: 'Ver lo mío', pantalla: 'produccion' },
      },
      tambien: [
        'El cliente tiene que escribir qué cambiar cuando pide cambios.',
        'Revisiones ya no se rompe al abrir una revisión de piezas respondida.',
      ],
      guia: 'Producción',
    },
  },
  {
    id: 'aprobacion-por-campana',
    fecha: '2026-10-13',
    titulo: 'La aprobación ahora es por campaña, y siempre tiene un responsable',
    cambios: [
      'Cada campaña dice quién aprueba —el equipo o el cliente— y quién es el responsable. Nada se produce sin esa aprobación.',
      'La marca se elige una sola vez, arriba, y vale para todas las pantallas.',
      '«Copy aprobado» ahora se llama «Copy» y muestra en qué paso va cada texto.',
      'Al cliente se le envía desde Copy; Revisiones sigue sus respuestas.',
    ],
    aviso: {
      porQue:
        'Hasta ahora un copy podía llegar a producción sin que nadie respondiera por él, y si el cliente lo rechazaba, la aprobación interna seguía en pie. Ahora cada campaña dice quién aprueba —el equipo o el cliente— y quién es el responsable. Nada se produce sin esa aprobación.',
      paraQuienAdministra: {
        titulo: 'Lo que te toca antes de que el copy avance',
        pasos: [
          'En Copy, elige cada campaña y nombra su responsable. Sin responsable, el copy se guarda pero no avanza: nadie puede aprobarlo.',
          'Define si la aprueba el equipo o el cliente. Si es el cliente, el responsable es quien le manda el enlace.',
          'El copy aprobado que no tenía campaña aparece en «Sin campaña»: asígnale una y apruébalo de nuevo.',
        ],
        accion: { label: 'Ir a nombrar responsables', pantalla: 'saved' },
      },
      paraElEquipo: {
        titulo: 'Qué cambia para ti',
        pasos: [
          'Si eres responsable de una campaña, en Copy vas a ver «Aprobar» o «Enviar al cliente» sobre su copy.',
          'Si no lo eres, el copy espera a quien responde: cada campaña dice quién es.',
          'Si una campaña no tiene responsable, su copy no avanza: avisale a quien administra para que lo nombre.',
        ],
        accion: { label: 'Ver Copy', pantalla: 'saved' },
      },
      tambien: [
        'La marca se elige una sola vez, arriba, y vale para todas las pantallas.',
        '«Copy aprobado» ahora se llama «Copy» y muestra en qué paso va cada texto.',
        'Al cliente se le envía desde Copy; Revisiones sigue sus respuestas.',
      ],
      guia: 'Copy',
    },
  },
  {
    id: 'revisiones-de-piezas',
    fecha: '2026-10-13',
    titulo: 'Corregido: Revisiones con piezas respondidas',
    cambios: [
      'Abrir una revisión de piezas que el cliente ya respondió rompía la pantalla. Ahora muestra qué aprobó, qué pidió cambiar y si el comentario es del mensaje o del arte.',
    ],
  },
  {
    id: 'campana-en-su-marca',
    fecha: '2026-10-13',
    titulo: 'Corregido: campañas que caían en otra marca',
    cambios: ['Una campaña creada desde Marcas podía quedar guardada en la primera marca de la lista. Ahora queda en la marca donde se creó.'],
  },
  {
    id: 'cliente-aprueba-la-pieza',
    fecha: '2026-09-26',
    titulo: 'El cliente aprueba también la pieza terminada',
    cambios: [
      'Una segunda revisión, sobre el arte final, con los comentarios de copy y de diseño por separado.',
      'El camino del copy a la pieza quedó a la vista, y el menú se reordenó en el orden en que ocurre el trabajo.',
      'Cada enlace de revisión es de una sola marca, y la marca se ve al actuar.',
    ],
  },
  {
    id: 'funciones-y-notificaciones',
    fecha: '2026-09-23',
    titulo: 'Funciones del equipo y notificaciones',
    cambios: [
      'Cada persona puede tener funciones —Copy, Diseño, Aprobación—, también por marca.',
      'La campana, arriba a la derecha, avisa lo que te toca.',
    ],
  },
  {
    id: 'varias-empresas',
    fecha: '2026-08-28',
    titulo: 'Varias empresas en una misma herramienta',
    cambios: [
      'Cada empresa tiene su espacio, su equipo y sus marcas, sin ver las de las demás.',
      'Invitaciones para sumar gente al equipo, y un selector para quien trabaja con varias empresas.',
      'El menú se ordena por etapas del trabajo, y cada pantalla tiene un solo nombre.',
    ],
  },
];

/** La novedad a avisar: la más reciente con aviso, que no vio y posterior a su alta. */
export const novedadPendiente = (vistas: string[] = [], altaISO?: string): Novedad | null => {
  const alta = altaISO ? altaISO.slice(0, 10) : null;
  return (
    NOVEDADES.find(n => n.aviso && !vistas.includes(n.id) && (!alta || alta < n.fecha)) ?? null
  );
};

/** «14 oct 2026». */
export const fechaCorta = (iso: string): string =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
