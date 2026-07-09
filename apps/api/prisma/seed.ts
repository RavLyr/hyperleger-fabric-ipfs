import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.issuer.upsert({
    where: { issuerId: 'UNDIP' },
    update: {
      organizationName: 'Universitas Diponegoro',
      departmentName: '',
      mspId: 'Org1MSP',
      username: 'admin',
      email: 'admin@undip.ac.id',
      passwordHash,
      isActive: true,
      status: 'ACTIVE'
    },
    create: {
      issuerId: 'UNDIP',
      organizationName: 'Universitas Diponegoro',
      departmentName: '',
      mspId: 'Org1MSP',
      username: 'admin',
      email: 'admin@undip.ac.id',
      passwordHash,
      isActive: true,
      status: 'ACTIVE'
    }
  });

  const passwordHashOrg2 = await bcrypt.hash('masadmin123', 10);

  await prisma.issuer.upsert({
    where: { issuerId: 'ITS' },
    update: {
      organizationName: 'Institut Teknologi Sepuluh Nopember',
      departmentName: '', // Dikosongkan agar dapat diisi manual di form
      mspId: 'Org2MSP',
      username: 'masadmin',
      email: 'admin@its.ac.id',
      passwordHash: passwordHashOrg2,
      isActive: true,
      status: 'ACTIVE'
    },
    create: {
      issuerId: 'ITS',
      organizationName: 'Institut Teknologi Sepuluh Nopember',
      departmentName: '', // Dikosongkan agar dapat diisi manual di form
      mspId: 'Org2MSP',
      username: 'masadmin',
      email: 'admin@its.ac.id',
      passwordHash: passwordHashOrg2,
      isActive: true,
      status: 'ACTIVE'
    }
  });
}

main()
  .catch(async (error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
