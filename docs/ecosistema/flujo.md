# Flujo de una campaña · quién, dónde, qué se aprueba y qué se avisa

Estado: propuesta · 2026-11-05 (suma Implementación y el historial de aprobaciones) · Términos: [glosario.md](./glosario.md)
Antecedente: [../v2/mapa-del-proceso.md](../v2/mapa-del-proceso.md), que este documento extiende a
las dos herramientas.

## 1. El recorrido

```mermaid
flowchart LR
  subgraph Comun[Parte común · marca transversal]
    S[Super Admin crea la marca<br/>y elige herramientas]
    E[Estrategia completa el ADN<br/>y las audiencias]
    M1[1 · Responsable crea la campaña<br/>y elige cómo sigue]
  end
  B[Planning mantiene la biblioteca<br/>y los paquetes · CDM]
  subgraph MV[My Voice]
    M2[2 · Copy escribe el brief<br/>y elige audiencias del ADN]
    M2 --> M3[3 · IA escribe textos raíz<br/>Copy los depura]
    M3 --> M4[4 · Responsable manda el toolkit]
    M4 --> M5[5 · Cliente aprueba el toolkit]
    M5 --> M7[7 · IA escribe cada formato<br/>con los campos de la biblioteca]
    M7 --> M8[8 · Responsable aprueba de a uno]
  end
  subgraph CDM
    C6[6 · Planning arma el<br/>cuadro de materiales]
  end
  subgraph PR[My Voice · Producción]
    C9[9 · Diseño produce la pieza<br/>con el copy aprobado]
    C10[10 · Responsable y cliente<br/>aprueban la pieza]
  end
  S --> E --> M1
  S --> B
  M1 -- sigue por My Voice --> M2
  M1 -- sigue por CDM --> C6
  C6 -. etapas .-> M3
  B -. biblioteca .-> C6
  C6 -. qué escribir .-> M7
  M8 -. qué texto va en qué formato .-> C9
  subgraph IMP[Parte común · Implementación]
    I11[11 · Trafficker monta cada anuncio<br/>o lo devuelve con novedad]
    I12[12 · Responsable revisa el reporte<br/>y lo envía al cliente]
  end
  C9 --> C10
  C10 -. estado de la pieza .-> C6
  C6 -. destino y UTM .-> I11
  C10 -- pieza aprobada --> I11
  I11 --> I12
  I11 -. estado de implementación .-> C6
  I12 --> MED[My Voice mide<br/>y aprende]
```

Después del paso 1 el responsable **elige cómo sigue la campaña**: directo a My Voice (paso 2) o por
CDM (paso 6). La otra herramienta se suma cuando quiera. El paso 6 corre en paralelo con 2 a 5; el
paso 7 espera al toolkit aprobado y al cuadro. El paso 11 junta las dos herramientas: cada anuncio
espera a su pieza aprobada (My Voice) y a su destino y UTM (CDM).

## 2. Paso a paso

| # | Herramienta | Quién | Hace | Entra | Sale | Pasa a |
|---|---|---|---|---|---|---|
| — | ambas | Super Admin | Crea la marca y decide qué herramientas usa. | — | Marca | Estrategia, Planning |
| — | Parte común | Estrategia (con la IA) | Completa y confirma el ADN; define las audiencias. Mínimo 75 % para crear campañas. | Fuentes de la marca | ADN, audiencias | — |
| — | CDM | Planning | Mantiene la biblioteca de medios y los paquetes de la marca. | Specs de los medios | Formatos activos | — |
| 1 | Parte común | Responsable | Crea la campaña, anota la referencia y **elige cómo sigue**: My Voice o CDM. | ADN apto | Campaña | Copy o Planning |
| 2 | My Voice | Copy | Escribe el brief y elige las audiencias del ADN para toda la campaña. | ADN | Brief | IA |
| 3 | My Voice | IA → Copy | La IA escribe textos raíz por etapa (las que trae el cuadro); Copy aprueba, rechaza con motivo o edita. | Brief, etapas del cuadro | Textos raíz | Responsable |
| 4 | My Voice | Responsable | Elige qué textos raíz van y manda el toolkit. | Textos raíz | Toolkit | Cliente |
| 5 | My Voice | Cliente | Aprueba el toolkit en el portal. Un rechazo vuelve a esa etapa. | Toolkit | Toolkit aprobado | Paso 7 |
| 6 | CDM | Planning | Arma el cuadro de materiales, de 10 a 200 líneas: medio, formato, etapa, variaciones, fechas. | Biblioteca | Cuadro | My Voice |
| 7 | My Voice | IA | Escribe el copy de cada formato (en pieza y de plataforma) desde los textos raíz de la etapa de la línea, para todas las audiencias de la campaña, sin pasarse del largo de cada campo. | Toolkit aprobado, cuadro | Adaptaciones | Responsable |
| 8 | My Voice | Responsable | Revisa de a uno: aprobar y seguir, pedir otra versión, editar. Lo que no cabe no se aprueba. | Adaptaciones | Copy aprobado por formato | CDM |
| 9 | My Voice · Producción | Diseño | Produce la pieza con el copy aprobado (después, en el Adaptador). | Copy aprobado, specs | Pieza | Responsable |
| 10 | My Voice · Producción | Responsable, cliente | Aprueban la pieza. CDM ve el estado. | Pieza | Pieza aprobada | Trafficker |
| — | CDM | Planning | Pega el destino y la UTM de cada línea cuando los tiene; puede ser al final, sin versión nueva del cuadro. | Cuadro | Destino y UTM | Trafficker |
| 11 | Parte común · Implementación | Trafficker | Recibe cada anuncio listo para montar (copy, destino, UTM, pieza y quién aprobó). Lo monta y registra plataforma, ID del anuncio y fecha real, o lo devuelve con una novedad. | Anuncios listos | Anuncios montados | Responsable |
| 12 | Parte común · Implementación | Responsable | Revisa el reporte de implementación (lo planeado contra lo montado, con novedades) y lo envía al cliente. | Anuncios montados | Reporte enviado | My Voice mide |

## 3. Bloqueos

| Bloqueo | Dónde | Qué ve el usuario |
|---|---|---|
| ADN bajo el mínimo | My Voice, al crear la campaña | Qué falta y un botón para completarlo. |
| Toolkit sin aprobar | My Voice, paso 7 | Las líneas del cuadro esperan, con el motivo. |
| Formato de un medio en borrador | CDM, al armar el cuadro | El formato no aparece para elegir. |
| Copy que no cabe en un campo | My Voice, paso 8 | El campo marcado y «Acortar»; no se puede aprobar. |
| Copy sin aprobar | CDM, en la línea | La línea muestra «Esperando el copy en My Voice». |
| Falta el destino o la UTM | Implementación, en el anuncio | «Falta la UTM · Planning», con el botón para avisarle. No se puede marcar montado. |
| Pieza sin aprobar | Implementación, en el anuncio | «Esperando la aprobación del cliente», con quién la tiene. |
| Copy o pieza cambiados después de montar | Implementación, en el anuncio | Vuelve a «por montar» con lo que cambió; el reporte lo cuenta como desviación. |

## 4. Navegación y avisos

Cada aprobación queda en su herramienta, así que el usuario tiene que saber en todo momento **dónde
está la campaña, qué falta y a quién le toca**, sin importar en qué herramienta esté parado.

Principios:

1. **Una campaña, un estado visible en las dos.** CDM muestra en qué paso de My Voice está la
   campaña y My Voice muestra en qué paso de CDM, con el mismo nombre de etapa.
2. **«Espera a».** Cada campaña dice a quién espera: la persona o la función, no un estado técnico.
3. **Un aviso lleva directo a la acción**, en la herramienta correcta, ya abierta en lo que hay que
   hacer. Nunca a una portada.
4. **Una cola por persona** reúne lo pendiente de todas las campañas y las dos herramientas,
   ordenado por fecha de salida.
5. **Al cruzar de herramienta, se dice.** Un botón que lleva a la otra herramienta dice adónde va
   («Ver el cuadro en CDM»).

| Evento | Se avisa a | Lleva a |
|---|---|---|
| ADN bajo el mínimo al crear una campaña | Estrategia | My Voice · ADN, en la primera sección que falta |
| Textos raíz listos para depurar | Copy | My Voice · Textos raíz, en la etapa |
| Textos raíz listos para el toolkit | Responsable | My Voice · Toolkit |
| Toolkit enviado | Cliente | Portal del toolkit |
| Toolkit aprobado | Responsable, Planning | My Voice · Adaptaciones / CDM · Cuadro |
| Toolkit rechazado | Copy, responsable | My Voice · Textos raíz, en la etapa rechazada |
| Etapa nueva en el cuadro | Copy, responsable | My Voice · Textos raíz, en la etapa nueva |
| Cuadro recibido o cambiado | Responsable | My Voice · Adaptaciones, con lo que cambió |
| Copy listo para aprobar | Responsable | My Voice · Adaptaciones, en el primero pendiente |
| Copy aprobado de una línea | Diseño, Planning | My Voice · Producción / CDM · Línea |
| Pieza lista para aprobar | Responsable, cliente | My Voice · Producción |
| Copy aprobado que cambió después | Diseño, Planning | My Voice · Producción (pieza «A revisar») / CDM · Línea |
| Anuncio listo para montar (todo aprobado, con destino y UTM) | Trafficker | Implementación, en el primer anuncio por montar |
| Pieza aprobada sin destino o UTM | Planning | CDM · Línea, en el campo que falta |
| Destino o UTM cambiados en un anuncio ya montado | Trafficker | Implementación, en ese anuncio |
| Anuncio devuelto con novedad | Quien lo debe: Planning (destino, UTM), responsable (copy, pieza) | La línea en CDM / la pieza en Producción, con la novedad |
| Todos los anuncios de la campaña montados | Responsable | Implementación · Reporte |
| Reporte de implementación enviado | Cliente | El archivo del reporte (Excel y PDF) |

Lo que falta definir del lado técnico: si las dos herramientas comparten la cola y las
notificaciones (un solo servicio) o cada una manda las suyas con enlaces a la otra. Ver
[decisiones.md](./decisiones.md), preguntas abiertas.

## 5. El historial de aprobaciones

Todas las aprobaciones de la campaña quedan en un solo historial, en la plataforma (decisión 19). Es el
mismo registro que muestran la vista de campaña, cada anuncio en Implementación y el reporte.

| # | Qué se aprueba o se ejecuta | Quién | Tipo | Dónde se decide |
|---|---|---|---|---|
| — | ADN confirmado | Estrategia | Aprobación interna | Parte común |
| 3 | Textos raíz | Copy | Aprobación interna | My Voice |
| 4 | Toolkit enviado | Responsable | Ejecución | My Voice |
| 5 | Toolkit | Cliente | Aprobación del cliente | Portal |
| 6 | Cuadro enviado (y cada versión) | Planning | Ejecución | CDM |
| 8 | Copy de cada formato | Responsable | Aprobación interna | My Voice |
| 9 | Pieza entregada | Diseño | Ejecución | My Voice · Producción |
| 10 | Pieza aceptada | Responsable | Aprobación interna | My Voice · Producción |
| 10 | Pieza | Cliente, si la campaña es con cliente | Aprobación del cliente | Portal |
| — | Destino y UTM pegados o cambiados | Planning | Ejecución | CDM |
| 11 | Anuncio montado o devuelto con novedad | Trafficker | Ejecución | Implementación |
| 12 | Reporte revisado y enviado | Responsable | Aprobación interna | Implementación |

Cada entrada guarda qué (con su versión), quién, cuándo, por dónde (pantalla o portal) y el comentario.
Un rechazo queda igual que una aprobación: el historial no se edita.
