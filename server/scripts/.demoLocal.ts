/**
 * Datos de ejemplo para mirar el tablero en local. NO es parte del producto:
 * el archivo empieza con punto y está fuera de git.
 */
import { PiezaEstado, PrismaClient, WorkspaceRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();

const huella = (formato: string, ids: string[]) =>
  createHash('sha256').update([formato, ...[...ids].sort()].join('|')).digest('hex');

const main = async () => {
  const ws = await prisma.workspace.create({
    data: { name: 'Buentipo', slug: 'local-' + Date.now(), plan: 'company' },
  });
  const hash = await bcrypt.hash('demo1234', 10);
  const gerardo = await prisma.user.create({
    data: { email: 'demo@example.com', name: 'Gerardo', passwordHash: hash, workspaceId: ws.id },
  });
  const luis = await prisma.user.create({
    data: { email: 'luis@example.com', name: 'Luis P.', passwordHash: hash, workspaceId: ws.id },
  });
  const ana = await prisma.user.create({
    data: { email: 'ana@example.com', name: 'Ana R.', passwordHash: hash, workspaceId: ws.id },
  });
  await prisma.membership.createMany({
    data: [
      { userId: gerardo.id, workspaceId: ws.id, role: WorkspaceRole.OWNER },
      { userId: luis.id, workspaceId: ws.id, role: WorkspaceRole.MEMBER },
      { userId: ana.id, workspaceId: ws.id, role: WorkspaceRole.MEMBER },
    ],
  });

  const terpel = await prisma.client.create({
    data: { name: 'Vive Terpel', industry: 'Combustibles', workspaceId: ws.id },
  });
  const huggies = await prisma.client.create({
    data: { name: 'Huggies', industry: 'Cuidado infantil', workspaceId: ws.id },
  });
  const octubre = await prisma.project.create({
    data: { name: 'Rendimiento · Octubre', workspaceId: ws.id },
  });
  const lanzamiento = await prisma.project.create({
    data: { name: 'Lanzamiento · Noviembre', workspaceId: ws.id },
  });

  const copy = (clientId: string, projectId: string, platform: string, slot: string, slotLabel: string, content: string) =>
    prisma.savedVariation.create({
      data: {
        clientId, projectId, platform, slot, slotLabel, content,
        type: 'Beneficio', charCount: content.length, tags: [], isApproved: true,
      },
    });

  // Campaña de octubre: ya está en producción, repartida en las cuatro columnas.
  const post = [
    await copy(terpel.id, octubre.id, 'Instagram Post', 'hook', 'Hook (línea 1)', 'Tu carro no necesita más gasolina. Necesita mejor gasolina.'),
    await copy(terpel.id, octubre.id, 'Instagram Post', 'body', 'Cuerpo del caption', 'Con Terpel Máxima tu motor rinde más kilómetros por tanque.'),
    await copy(terpel.id, octubre.id, 'Instagram Post', 'hashtags', 'Hashtags', '#ViveTerpel #TerpelMáxima #RutaSegura'),
    await copy(terpel.id, octubre.id, 'Instagram Post', 'visualBrief', 'Idea visual', 'Plano cenital de un carro entrando a la estación al amanecer. Luz cálida sobre el surtidor. El hook va en la mitad superior, sobre cielo despejado: dejar aire, no llenar.'),
  ];
  const historia = [
    await copy(terpel.id, octubre.id, 'Instagram Historia', 'copy', 'Copy principal', 'Una parada. Mil kilómetros mejor.'),
    await copy(terpel.id, octubre.id, 'Instagram Historia', 'swipeCTA', 'CTA / swipe-up', 'Buscá tu estación'),
  ];
  const display = [
    await copy(terpel.id, octubre.id, 'Google Display', 'shortTitle', 'Título Corto', 'Rendí más por tanque'),
    await copy(terpel.id, octubre.id, 'Google Display', 'description', 'Descripción', 'Terpel Máxima: más kilómetros, mismo tanque.'),
  ];
  const reel = [
    await copy(terpel.id, octubre.id, 'Instagram Reel', 'verbalHook', 'Hook verbal (0-3s)', 'Hay rutas que uno hace mil veces. Esta se siente distinta.'),
    await copy(terpel.id, octubre.id, 'Instagram Reel', 'structure', 'Estructura escena por escena', '0-3s ruta al amanecer · 3-8s surtidor · 8-12s carro en movimiento · cierre con logo.'),
  ];

  const grupo = crypto.randomUUID();
  const crear = async (
    clientId: string, projectId: string, platform: string, tipo: 'GRAFICA' | 'VIDEO',
    formato: string, titulo: string, estado: PiezaEstado,
    slots: { id: string; slot: string | null; slotLabel: string | null; content: string }[],
    extra: { asignadaAId?: string; enlace?: string; grupoId?: string } = {}
  ) =>
    prisma.pieza.create({
      data: {
        workspaceId: ws.id, clientId, projectId, platform, tipo, formato, titulo, estado,
        huella: huella(formato, slots.map(s => s.id)),
        creadaPorId: gerardo.id,
        ...extra,
        slots: {
          create: slots.map((s, orden) => ({
            savedVariationId: s.id,
            slot: s.slot ?? 'sinSlot',
            slotLabel: s.slotLabel ?? s.slot ?? 'sinSlot',
            textoCongelado: s.content,
            esInstruccion: ['visualBrief', 'structure', 'animationBrief', 'production'].includes(s.slot ?? ''),
            orden,
          })),
        },
        eventos: {
          create: [
            { tipo: 'CREADA', aEstado: PiezaEstado.POR_ASIGNAR, autorId: gerardo.id },
            ...(extra.asignadaAId
              ? [{ tipo: 'ASIGNADA', deEstado: PiezaEstado.POR_ASIGNAR, aEstado: PiezaEstado.EN_DISENO, autorId: gerardo.id }]
              : []),
          ],
        },
      },
    });

  await crear(terpel.id, octubre.id, 'Instagram Post', 'GRAFICA', '1080×1080', 'Rendimiento · Octubre — pieza principal de feed', PiezaEstado.EN_DISENO, post, { asignadaAId: luis.id, grupoId: grupo });
  await crear(terpel.id, octubre.id, 'Instagram Historia', 'GRAFICA', '1080×1920', 'Rendimiento · Octubre — historia de refuerzo', PiezaEstado.POR_ASIGNAR, historia, { grupoId: grupo });
  await crear(terpel.id, octubre.id, 'Google Display', 'GRAFICA', '300×250', 'Rendimiento · Octubre — banner de retargeting', PiezaEstado.POR_REVISAR, display, { asignadaAId: ana.id, enlace: 'https://figma.com/file/display-300x250' });
  await crear(terpel.id, octubre.id, 'Instagram Reel', 'VIDEO', '1080×1920', 'Rendimiento · Octubre — reel de apertura', PiezaEstado.LISTA, reel, { asignadaAId: luis.id, enlace: 'https://drive.google.com/reel-terpel-v2' });

  // Copy editado DESPUÉS de mandarlo a producir: dispara el aviso de la tarjeta.
  await prisma.savedVariation.update({
    where: { id: post[1].id },
    data: { content: 'Con Terpel Máxima tu motor rinde MUCHO más por tanque.' },
  });

  // Campaña de noviembre: aprobada y sin mandar a producción todavía, para
  // probar el alta desde la Biblioteca. Incluye dos hooks (la pregunta del A/B)
  // y un canal que no entra al tablero.
  await copy(huggies.id, lanzamiento.id, 'Instagram Post', 'hook', 'Hook (línea 1)', 'Dormir toda la noche también es cosa de dos.');
  await copy(huggies.id, lanzamiento.id, 'Instagram Post', 'hook', 'Hook (línea 1)', 'Doce horas secas. Y vos, doce horas tranquila.');
  await copy(huggies.id, lanzamiento.id, 'Instagram Post', 'body', 'Cuerpo del caption', 'La nueva capa absorbe más y se siente menos. Probala esta semana.');
  await copy(huggies.id, lanzamiento.id, 'Instagram Post', 'visualBrief', 'Idea visual', 'Primer plano de bebé durmiendo, luz de madrugada entrando por la ventana.');
  await copy(huggies.id, lanzamiento.id, 'Instagram Historia', 'copy', 'Copy principal', 'Doce horas secas.');
  await copy(huggies.id, lanzamiento.id, 'Google Display', 'shortTitle', 'Título Corto', 'Doce horas secas');
  await copy(huggies.id, lanzamiento.id, 'Google Ads', 'shortTitle', 'Título Corto', 'Pañales Huggies · envío gratis');

  console.log('\nDatos listos.\n');
  console.log('  http://localhost:3010');
  console.log('  demo@example.com / demo1234   (Gerardo, OWNER)');
  console.log('  luis@example.com / demo1234   (Luis P., MEMBER — la vista del diseñador)');
  console.log('  ana@example.com  / demo1234   (Ana R., MEMBER)\n');
};

main().finally(() => prisma.$disconnect());
