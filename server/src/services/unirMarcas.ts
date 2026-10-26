/**
 * Unir dos marcas que eran la misma (docs/plan-marcas-relacionadas.md, entrega 2).
 *
 * Todo lo de la marca de origen pasa a la de destino y el origen se borra. Va
 * en **una sola transacción**: si algo falla, no se mueve nada.
 *
 * Cuatro tablas borran en cascada con la marca —consumo, feedback negativo,
 * funciones del equipo, notificaciones—, así que olvidarse de mover una es
 * perder sus filas sin que nadie se entere. Por eso, antes de borrar el origen,
 * se cuenta que no le quede nada apuntando.
 */

import { prisma } from '../lib/prisma.js';
import { assertClientInWorkspace, TenantContext, TenantError } from '../lib/tenancy.js';

export interface ResultadoUnion {
  destinoId: string;
  /** Cuántas filas pasó a la marca de destino, por tabla. */
  movidas: Record<string, number>;
  /** Consumo de meses que las dos marcas tenían: se sumó en vez de moverse. */
  periodosSumados: number;
  /** Funciones que el destino ya tenía: la del origen se descartó. */
  funcionesRepetidas: number;
}

/** Las tablas que solo cambian de clientId, sin restricciones de unicidad que choquen. */
const MOVIBLES = [
  'generationLog',
  'contentDNAProfile',
  'savedVariation',
  'project',
  'negativeFeedback',
  'generationPreset',
  'pieza',
  'notificacion',
  'user',
] as const;

export const unirMarcas = async (
  tenant: TenantContext,
  origenId: string,
  destinoId: string
): Promise<ResultadoUnion> => {
  if (!destinoId || typeof destinoId !== 'string') throw new TenantError('Falta con qué marca se fusiona', 400);
  if (origenId === destinoId) throw new TenantError('Una marca no se fusiona consigo misma', 400);
  // Las dos del workspace; si una es ajena, 404 y no se toca nada.
  const origen = await assertClientInWorkspace(tenant, origenId);
  const destino = await assertClientInWorkspace(tenant, destinoId);

  const hijasDelOrigen = await prisma.client.count({ where: { marcaMadreId: origen.id, id: { not: destino.id } } });
  // Un solo nivel: si el destino es complementaria de otra, no puede recibir
  // las complementarias del origen.
  if (hijasDelOrigen > 0 && destino.marcaMadreId && destino.marcaMadreId !== origen.id)
    throw new TenantError(
      `«${destino.name}» es submarca de otra y «${origen.name}» tiene submarcas: no pueden pasar a ella. Un solo nivel.`,
      400
    );

  return prisma.$transaction(
    async tx => {
      const movidas: Record<string, number> = {};
      const donde = { clientId: origen.id };
      const hacia = { clientId: destino.id };

      for (const tabla of MOVIBLES) {
        const delegado = tx[tabla] as unknown as {
          updateMany: (a: { where: typeof donde; data: typeof hacia }) => Promise<{ count: number }>;
        };
        movidas[tabla] = (await delegado.updateMany({ where: donde, data: hacia })).count;
      }

      // Consumo: @@unique([clientId, periodStart]). El mes que tienen las dos
      // se suma en la fila del destino; el que solo tiene el origen, se mueve.
      let periodosSumados = 0;
      const periodos = await tx.usagePeriod.findMany({ where: donde });
      for (const p of periodos) {
        const delDestino = await tx.usagePeriod.findUnique({
          where: { clientId_periodStart: { clientId: destino.id, periodStart: p.periodStart } },
        });
        if (delDestino) {
          await tx.usagePeriod.update({
            where: { id: delDestino.id },
            data: {
              generations: { increment: p.generations },
              costUsd: { increment: p.costUsd },
              tokens: { increment: p.tokens },
            },
          });
          await tx.usagePeriod.delete({ where: { id: p.id } });
          periodosSumados++;
        } else {
          await tx.usagePeriod.update({ where: { id: p.id }, data: hacia });
        }
      }
      movidas.usagePeriod = periodos.length;

      // Funciones: @@unique([workspaceId, userId, funcion, clientId]). La que el
      // destino ya tiene, se descarta; la otra, se mueve.
      let funcionesRepetidas = 0;
      const funciones = await tx.miembroFuncion.findMany({ where: donde });
      for (const f of funciones) {
        const ya = await tx.miembroFuncion.findFirst({
          where: { workspaceId: f.workspaceId, userId: f.userId, funcion: f.funcion, clientId: destino.id },
        });
        if (ya) {
          await tx.miembroFuncion.delete({ where: { id: f.id } });
          funcionesRepetidas++;
        } else {
          await tx.miembroFuncion.update({ where: { id: f.id }, data: hacia });
        }
      }
      movidas.miembroFuncion = funciones.length;

      // La familia: si el destino era complementaria del origen, queda suelto;
      // las otras complementarias del origen pasan al destino.
      if (destino.marcaMadreId === origen.id)
        await tx.client.update({ where: { id: destino.id }, data: { marcaMadreId: null } });
      movidas.complementarias = (
        await tx.client.updateMany({ where: { marcaMadreId: origen.id }, data: { marcaMadreId: destino.id } })
      ).count;

      // Antes de borrar: nada puede seguir apuntando al origen, o el borrado se
      // llevaría filas en cascada.
      const restos = await Promise.all([
        ...MOVIBLES.map(t => (tx[t] as unknown as { count: (a: object) => Promise<number> }).count({ where: donde })),
        tx.usagePeriod.count({ where: donde }),
        tx.miembroFuncion.count({ where: donde }),
      ]);
      if (restos.some(n => n > 0)) throw new Error(`Quedaron filas apuntando a la marca de origen: ${restos.join(',')}`);

      await tx.client.delete({ where: { id: origen.id } });
      return { destinoId: destino.id, movidas, periodosSumados, funcionesRepetidas };
    },
    // Una marca con mucho historial mueve miles de filas: el default de 5 s no alcanza.
    { timeout: 60_000 }
  );
};
