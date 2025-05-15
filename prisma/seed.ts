import { faker } from "@faker-js/faker";
import { PrismaClient, Role, LoanStatus, PaymentMethod, ExpenseCategory } from "../generated/prisma";
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const password = 'admin123';


async function main() {
    console.log('Seeding database...');
    const hashedAdminPassword = await bcrypt.hash(password, 10);
    // Crear propietarios
    const owner = await prisma.owners.create({
        data: {
            username: 'admin',
            passwordHash: hashedAdminPassword,
            roles: [Role.ADMIN],
        },
    });

    // Crear usuarios
    const users = await Promise.all(
        Array.from({ length: 3 }).map(() =>
            prisma.user.create({
                data: {
                    name: faker.person.fullName(),
                    identification: faker.string.alphanumeric(10),
                    age: faker.number.int({ min: 18, max: 65 }),
                    phone: faker.phone.number(),
                    address: faker.location.streetAddress(),
                    refName: faker.person.fullName(),
                    refID: faker.string.alphanumeric(10),
                    refPhone: faker.phone.number(),
                },
            })
        )
    );

    // Crear motocicletas
    const motorcycles = await Promise.all(
        Array.from({ length: 3 }).map(() =>
            prisma.motorcycle.create({
                data: {
                    brand: faker.vehicle.manufacturer(),
                    model: faker.vehicle.model(),
                    plate: faker.vehicle.vrm(),
                    color: faker.color.human(),
                    cc: faker.number.int({ min: 100, max: 400 }),
                    gps: faker.number.float({ min: -75, max: -70 }),
                },
            })
        )
    );

    // Crear préstamos
    const loans = await Promise.all(
        users.map((user, i) =>
            prisma.loan.create({
                data: {
                    userId: user.id,
                    motorcycleId: motorcycles[i % motorcycles.length].id,
                    totalAmount: 3000000,
                    downPayment: 500000,
                    installments: 10,
                    paidInstallments: 3,
                    remainingInstallments: 7,
                    totalPaid: 900000,
                    debtRemaining: 2100000,
                    interestRate: 0.05,
                    interestType: 'FIXED',
                    paymentFrequency: 'DAILY',
                    dailyPaymentAmount: 30000,
                    status: LoanStatus.ACTIVE,
                },
            })
        )
    );

    // Crear pagos (cuotas)
    const installments = await Promise.all(
        loans.flatMap((loan) =>
            Array.from({ length: loan.paidInstallments }).map(() =>
                prisma.installment.create({
                    data: {
                        loanId: loan.id,
                        amount: loan.dailyPaymentAmount,
                        paymentMethod: PaymentMethod.CASH,
                        isLate: faker.datatype.boolean(),
                    },
                })
            )
        )
    );

    // Crear un cierre de caja
    const cashRegister = await prisma.cashRegister.create({
        data: {
            cashInRegister: 500000,
            cashFromTransfers: 200000,
            cashFromCards: 100000,
            notes: 'Cierre diario de prueba',
            payments: {
                connect: installments.map((i) => ({ id: i.id })),
            },
        },
    });

    // Crear egresos
    await Promise.all(
        Array.from({ length: 3 }).map(() =>
            prisma.expense.create({
                data: {
                    amount: faker.number.float({ min: 50000, max: 300000 }),
                    date: faker.date.recent(),
                    category: ExpenseCategory.SERVICES,
                    paymentMethod: PaymentMethod.CASH,
                    beneficiary: faker.company.name(),
                    reference: faker.string.uuid(),
                    description: faker.lorem.sentence(),
                    attachments: [faker.internet.url()],
                    cashRegisterId: cashRegister.id,
                },
            })
        )
    );

    console.log('Seeding completed!');
}

main()
    .catch((e) => {
        console.error('Seeding error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });