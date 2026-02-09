
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(process.env.MASTER_PASSWORD || 'Lobueno2025*', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lobueno.co' },
    update: {},
    create: {
      email: 'admin@lobueno.co',
      passwordHash: passwordHash,
      name: 'Super Admin Lobueno',
      role: 'ADMIN',
    },
  });

  console.log({ admin });

  const brands = [
    { name: 'Terpel', industry: 'Energía y Combustibles' },
    { name: 'Huggies', industry: 'Cuidado Infantil' },
    { name: 'Volkswagen', industry: 'Automotriz' },
    { name: 'Colmédica', industry: 'Salud' },
  ];

  for (const brand of brands) {
    const createdBrand = await prisma.client.upsert({
      where: { id: brand.name.toLowerCase() }, // Using name based ID for upsert safety in this simple script
      update: {},
      create: {
        name: brand.name,
        industry: brand.industry,
      },
    });
    console.log(`Brand created: ${createdBrand.name}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
