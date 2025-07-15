/**
 * migrate-full.ts
 * Ejecuta:  ts-node migrate-full.ts
 * Requiere: @prisma/client  p-map  ts-node
 */

import { PrismaClient } from './generated/prisma';
import pMap from 'p-map';

const oldDb = new PrismaClient({
    datasources: { db: { url: 'postgresql://root:wwdO0CjInS8R5II@168.231.69.75:7891/main' } },
});
const newDb = new PrismaClient({
    datasources: { db: { url: 'postgresql://root:wwdO0CjInS8R5II@168.231.69.75:7891/prod' } },
});

async function ensureProvider(name: string): Promise<string> {
    const existing = await newDb.provider.findFirst({ where: { name } });
    if (existing) {
        console.log(`✓ Proveedor reutilizado: ${name} → ${existing.id}`);
        return existing.id;
    }
    const created = await newDb.provider.create({ data: { name } });
    console.log(`➕ Proveedor creado: ${name} → ${created.id}`);
    return created.id;
}

async function migrate() {
    console.log('\n🚚  *** INICIO MIGRACIÓN COMPLETA ***\n');

    /* ─────────────── 1. Owners ─────────────── */
    const owners = await oldDb.owners.findMany();
    let ownersInserted = 0;
    for (const o of owners) {
        const exists = await newDb.owners.findUnique({ where: { username: o.username } });
        if (exists) {
            console.log(`↩️  Owner omitido (ya existe): ${o.username} (${o.id})`);
            continue;
        }
        await newDb.owners.create({ data: o });
        console.log(`👑 Owner insertado: ${o.username} (${o.id})`);
        ownersInserted++;
    }
    console.log(`✔️  Owners migrados: ${ownersInserted}/${owners.length}\n`);

    /* ─────────────── 2. Users ─────────────── */
    const users = await oldDb.user.findMany();
    await pMap(
        users,
        async (u) => {
            await newDb.user.create({ data: u });
            console.log(`👤 User: ${u.name} (${u.id})`);
        },
        { concurrency: 20 }
    );
    console.log(`✔️  Users migrados: ${users.length}\n`);

    /* ─────────────── 3. Providers ─────────────── */
    const enumProviders = await oldDb.$queryRaw<{ provider: string }[]>`
    SELECT DISTINCT provider FROM (
      SELECT provider::text FROM "Motorcycle"
      UNION ALL
      SELECT provider::text FROM "CashRegister"
      UNION ALL
      SELECT provider::text FROM "Expense"
    ) t
  `;
    const providerMap: Record<string, string> = {};
    for (const { provider } of enumProviders) {
        providerMap[provider] = await ensureProvider(provider);
    }
    console.log(`✔️  Providers totales: ${Object.keys(providerMap).length}\n`);

    /* ─────────────── 4. Motorcycles ─────────────── */
    const motorcycles = await oldDb.$queryRaw<any[]>`SELECT * FROM "Motorcycle"`;
    await pMap(
        motorcycles,
        async (m) => {
            await newDb.motorcycle.create({
                data: {
                    id: m.id,
                    provider: { connect: { id: providerMap[m.provider] } },
                    brand: m.brand,
                    model: m.model,
                    plate: m.plate,
                    engine: m.engine,
                    chassis: m.chassis,
                    color: m.color,
                    cc: m.cc,
                    gps: m.gps,
                    createdAt: m.createdAt,
                    updatedAt: m.updatedAt,
                },
            });
            console.log(`🏍️  Moto: ${m.plate} (${m.id})`);
        },
        { concurrency: 25 }
    );
    console.log(`✔️  Motorcycles migradas: ${motorcycles.length}\n`);

    /* ─────────────── 5. Loans ─────────────── */
    const loans = await oldDb.loan.findMany();
    await pMap(
        loans,
        async (l) => {
            await newDb.loan.create({ data: l });
            console.log(`📄 Loan: ${l.id}`);
        },
        { concurrency: 30 }
    );
    console.log(`✔️  Loans migrados: ${loans.length}\n`);

    /* ─────────────── 6. CashRegisters ─────────────── */
    const closings = await oldDb.$queryRaw<any[]>`SELECT * FROM "CashRegister"`;
    await pMap(
        closings,
        async (c) => {
            await newDb.cashRegister.create({
                data: {
                    id: c.id,
                    date: c.date,
                    provider: { connect: { id: providerMap[c.provider] } },
                    cashInRegister: c.cashInRegister,
                    cashFromTransfers: c.cashFromTransfers,
                    cashFromCards: c.cashFromCards,
                    notes: c.notes,
                    createdAt: c.createdAt,
                    updatedAt: c.updatedAt,
                    createdBy: c.createdById ? { connect: { id: c.createdById } } : undefined,
                },
            });
            console.log(`🧾 CashRegister: ${c.id}`);
        },
        { concurrency: 25 }
    );
    console.log(`✔️  CashRegisters migrados: ${closings.length}\n`);

    /* ─────────────── 7. Installments ─────────────── */
    const installments = await oldDb.installment.findMany();
    await pMap(
        installments,
        async (i) => {
            const { createdById, cashRegisterId, loanId, ...rest } = i;
            await newDb.installment.create({
                data: {
                    id: rest.id,
                    paymentMethod: rest.paymentMethod,
                    amount: rest.amount,
                    gps: rest.gps,
                    paymentDate: rest.paymentDate,
                    isLate: rest.isLate,
                    latePaymentDate: rest.latePaymentDate,
                    notes: rest.notes,
                    attachmentUrl: rest.attachmentUrl,
                    archived: rest.archived,
                    createdAt: rest.createdAt,
                    updatedAt: rest.updatedAt,
                    loan: { connect: { id: loanId } },
                    ...(createdById && { createdBy: { connect: { id: createdById } } }),
                    ...(cashRegisterId && { cashRegister: { connect: { id: cashRegisterId } } }),
                },
            });
            console.log(`💸 Installment: ${i.id}`);
        },
        { concurrency: 30 }
    );
    console.log(`✔️  Installments migrados: ${installments.length}\n`);

    /* ─────────────── 8. Expenses ─────────────── */
    const expenses = await oldDb.$queryRaw<any[]>`SELECT * FROM "Expense"`;
    await pMap(
        expenses,
        async (e) => {
            await newDb.expense.create({
                data: {
                    id: e.id,
                    amount: e.amount,
                    date: e.date,
                    category: e.category,
                    paymentMethod: e.paymentMethod,
                    beneficiary: e.beneficiary,
                    reference: e.reference,
                    description: e.description,
                    attachmentUrl: e.attachmentUrl,
                    createdAt: e.createdAt,
                    updatedAt: e.updatedAt,
                    createdBy: e.createdById ? { connect: { id: e.createdById } } : undefined,
                    cashRegister: e.cashRegisterId ? { connect: { id: e.cashRegisterId } } : undefined,
                    provider: { connect: { id: providerMap[e.provider] } },
                },
            });
            console.log(`📤 Expense: ${e.id}`);
        },
        { concurrency: 30 }
    );
    console.log(`✔️  Expenses migrados: ${expenses.length}\n`);

    console.log('🎉  *** MIGRACIÓN COMPLETADA SIN ERRORES ***');
}

migrate()
    .catch((err) => console.error('❌ Error en migración:', err))
    .finally(async () => {
        await oldDb.$disconnect();
        await newDb.$disconnect();
    });
