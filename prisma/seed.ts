import fs from 'fs/promises';
import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient();
const password = 'admin123'

async function main() {

  const hashedAdminPassword = await bcrypt.hash(password, 10);
  await prisma.owners.create({
    data:

    {
      name: 'Administrador 2',
      passwordHash: hashedAdminPassword,
      username: 'admin2',
      roles: ['ADMIN']
    }
  });

}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error durante la siembra de datos:\n', e);
    await prisma.$disconnect();
    process.exit(1);
  });