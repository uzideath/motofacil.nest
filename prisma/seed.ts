
import * as bcrypt from 'bcrypt';
import { PrismaClient, StoreStatus, UserRole } from '../src/prisma/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting multi-store seed...');

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CREATE STORES
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating stores...');

  const store1 = await prisma.store.upsert({
    where: { code: 'BOG-01' },
    update: {},
    create: {
      name: 'Bogotá Principal',
      code: 'BOG-01',
      nit: '900123456-1',
      address: 'Calle 100 #15-23',
      city: 'Bogotá',
      phone: '+57 1 234 5678',
      status: StoreStatus.ACTIVE,
    },
  });
  console.log(`  ✅ Created store: ${store1.name} (${store1.code}) - NIT: ${store1.nit}`);

  const store2 = await prisma.store.upsert({
    where: { code: 'MED-01' },
    update: {},
    create: {
      name: 'Medellín Centro',
      code: 'MED-01',
      nit: '900234567-2',
      address: 'Carrera 43 #52-18',
      city: 'Medellín',
      phone: '+57 4 567 8901',
      status: StoreStatus.ACTIVE,
    },
  });
  console.log(`  ✅ Created store: ${store2.name} (${store2.code}) - NIT: ${store2.nit}`);

  const store3 = await prisma.store.upsert({
    where: { code: 'CALI-01' },
    update: {},
    create: {
      name: 'Cali Norte',
      code: 'CALI-01',
      nit: '900345678-3',
      address: 'Avenida 6N #25-45',
      city: 'Cali',
      phone: '+57 2 345 6789',
      status: StoreStatus.ACTIVE,
    },
  });
  console.log(`  ✅ Created store: ${store3.name} (${store3.code}) - NIT: ${store3.nit}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CREATE ADMIN USER (Global Access)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n👤 Creating admin user...');

  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.employee.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrador General',
      username: 'admin',
      email: 'admin@motofacil.com',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      storeId: null, // Admin has no store restriction
      status: 'ACTIVE',
    },
  });
  console.log(`  ✅ Created admin: ${admin.name} (${admin.username})`);
  console.log(`     📧 Email: ${admin.email}`);
  console.log(`     🔑 Password: Admin123!`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. CREATE EMPLOYEES (One per store)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n👥 Creating employees...');

  const employeePasswordHash = await bcrypt.hash('Employee123!', 10);

  const employee1 = await prisma.employee.upsert({
    where: { username: 'emp.bogota' },
    update: {},
    create: {
      name: 'Juan Pérez',
      username: 'emp.bogota',
      email: 'juan.perez@motofacil.com',
      passwordHash: employeePasswordHash,
      role: UserRole.EMPLOYEE,
      storeId: store1.id,
      status: 'ACTIVE',
    },
  });
  console.log(`  ✅ Created employee: ${employee1.name} → ${store1.name}`);

  const employee2 = await prisma.employee.upsert({
    where: { username: 'emp.medellin' },
    update: {},
    create: {
      name: 'María González',
      username: 'emp.medellin',
      email: 'maria.gonzalez@motofacil.com',
      passwordHash: employeePasswordHash,
      role: UserRole.EMPLOYEE,
      storeId: store2.id,
      status: 'ACTIVE',
    },
  });
  console.log(`  ✅ Created employee: ${employee2.name} → ${store2.name}`);

  const employee3 = await prisma.employee.upsert({
    where: { username: 'emp.cali' },
    update: {},
    create: {
      name: 'Carlos Rodríguez',
      username: 'emp.cali',
      email: 'carlos.rodriguez@motofacil.com',
      passwordHash: employeePasswordHash,
      role: UserRole.EMPLOYEE,
      storeId: store3.id,
      status: 'ACTIVE',
    },
  });
  console.log(`  ✅ Created employee: ${employee3.name} → ${store3.name}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. CREATE SAMPLE PROVIDERS (One per store)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n🏭 Creating sample providers...');

  const provider1 = await prisma.provider.upsert({
    where: { 
      name_storeId: {
        name: 'Proveedor Bogotá',
        storeId: store1.id,
      }
    },
    update: {},
    create: {
      name: 'Proveedor Bogotá',
      storeId: store1.id,
    },
  });
  console.log(`  ✅ Created provider: ${provider1.name} → ${store1.name}`);

  const provider2 = await prisma.provider.upsert({
    where: { 
      name_storeId: {
        name: 'Proveedor Medellín',
        storeId: store2.id,
      }
    },
    update: {},
    create: {
      name: 'Proveedor Medellín',
      storeId: store2.id,
    },
  });
  console.log(`  ✅ Created provider: ${provider2.name} → ${store2.name}`);

  const provider3 = await prisma.provider.upsert({
    where: { 
      name_storeId: {
        name: 'Proveedor Cali',
        storeId: store3.id,
      }
    },
    update: {},
    create: {
      name: 'Proveedor Cali',
      storeId: store3.id,
    },
  });
  console.log(`  ✅ Created provider: ${provider3.name} → ${store3.name}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(80));
  console.log('✨ Multi-store seed completed successfully!');
  console.log('═'.repeat(80));
  console.log('\n📊 Summary:');
  console.log(`  • Stores created: 3`);
  console.log(`  • Admin users: 1`);
  console.log(`  • Employees: 3 (1 per store)`);
  console.log(`  • Providers: 3 (1 per store)`);
  
  console.log('\n🔐 Login Credentials:');
  console.log('\n  ADMIN (Global Access):');
  console.log(`    Username: admin`);
  console.log(`    Password: Admin123!`);
  console.log(`    Access: All stores`);
  
  console.log('\n  EMPLOYEES (Store-Level Access):');
  console.log(`    Username: emp.bogota | Password: Employee123! | Store: ${store1.name}`);
  console.log(`    Username: emp.medellin | Password: Employee123! | Store: ${store2.name}`);
  console.log(`    Username: emp.cali | Password: Employee123! | Store: ${store3.name}`);
  
  console.log('\n🎯 Next Steps:');
  console.log('  1. Run: npm run prisma:generate');
  console.log('  2. Update JWT payload to include role and storeId');
  console.log('  3. Implement RolesGuard and StoreAccessGuard');
  console.log('  4. Update all services with store scoping');
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
