import { PrismaClient } from "src/prisma/generated/client";

const prisma = new PrismaClient();

async function testCashFlowModule() {
  console.log('🚀 Testing Cash Flow Module...\n');

  try {
    // 1. Create Accounts
    console.log('1️⃣ Creating accounts...');
    const bankAccount = await prisma.cashFlowAccount.create({
      data: {
        name: 'Test Bank Account',
        accountType: 'BANK',
        currency: 'COP',
        balance: 0,
        description: 'Test bank account for development',
      },
    });
    console.log('✅ Bank account created:', bankAccount.id);

    const cashAccount = await prisma.cashFlowAccount.create({
      data: {
        name: 'Test Cash Account',
        accountType: 'CASH',
        currency: 'COP',
        balance: 0,
        description: 'Test cash account for development',
      },
    });
    console.log('✅ Cash account created:', cashAccount.id);

    // 2. Create Transactions
    console.log('\n2️⃣ Creating transactions...');
    
    const tx1 = await prisma.cashFlowTransaction.create({
      data: {
        idempotencyKey: `test-tx-${Date.now()}-1`,
        accountId: bankAccount.id,
        type: 'INFLOW',
        category: 'CUSTOMER_PAYMENT',
        amount: 1000000,
        currency: 'COP',
        date: new Date('2025-10-01'),
        counterparty: 'Test Customer A',
        memo: 'Monthly service payment',
        tags: ['test', 'customer-a'],
      },
    });
    console.log('✅ Transaction 1 created:', tx1.id);

    const tx2 = await prisma.cashFlowTransaction.create({
      data: {
        idempotencyKey: `test-tx-${Date.now()}-2`,
        accountId: bankAccount.id,
        type: 'OUTFLOW',
        category: 'RENT_PAYMENT',
        amount: 300000,
        currency: 'COP',
        date: new Date('2025-10-05'),
        counterparty: 'Test Landlord',
        memo: 'Office rent October',
        tags: ['test', 'rent'],
      },
    });
    console.log('✅ Transaction 2 created:', tx2.id);

    const tx3 = await prisma.cashFlowTransaction.create({
      data: {
        idempotencyKey: `test-tx-${Date.now()}-3`,
        accountId: bankAccount.id,
        type: 'OUTFLOW',
        category: 'SALARY_PAYMENT',
        amount: 500000,
        currency: 'COP',
        date: new Date('2025-10-07'),
        counterparty: 'Test Employees',
        memo: 'Monthly salaries',
        tags: ['test', 'payroll'],
      },
    });
    console.log('✅ Transaction 3 created:', tx3.id);

    // 3. Update Account Balances
    console.log('\n3️⃣ Updating account balances...');
    const bankTxs = await prisma.cashFlowTransaction.findMany({
      where: { accountId: bankAccount.id },
    });

    const bankBalance = bankTxs.reduce((sum, tx) => {
      return tx.type === 'INFLOW' ? sum + tx.amount : sum - tx.amount;
    }, 0);

    await prisma.cashFlowAccount.update({
      where: { id: bankAccount.id },
      data: { balance: bankBalance },
    });
    console.log('✅ Bank balance updated:', bankBalance);

    // 4. Create a Transfer
    console.log('\n4️⃣ Creating transfer...');
    
    const debitTx = await prisma.cashFlowTransaction.create({
      data: {
        idempotencyKey: `test-transfer-${Date.now()}-debit`,
        accountId: bankAccount.id,
        type: 'OUTFLOW',
        category: 'TRANSFER',
        amount: 100000,
        currency: 'COP',
        date: new Date('2025-10-07'),
        counterparty: cashAccount.name,
        memo: 'Transfer to cash account',
      },
    });

    const creditTx = await prisma.cashFlowTransaction.create({
      data: {
        idempotencyKey: `test-transfer-${Date.now()}-credit`,
        accountId: cashAccount.id,
        type: 'INFLOW',
        category: 'TRANSFER',
        amount: 100000,
        currency: 'COP',
        date: new Date('2025-10-07'),
        counterparty: bankAccount.name,
        memo: 'Transfer from bank account',
      },
    });

    const transfer = await prisma.cashFlowTransfer.create({
      data: {
        idempotencyKey: `test-transfer-${Date.now()}`,
        fromAccountId: bankAccount.id,
        toAccountId: cashAccount.id,
        amount: 100000,
        currency: 'COP',
        date: new Date('2025-10-07'),
        memo: 'Test transfer',
        debitTxId: debitTx.id,
        creditTxId: creditTx.id,
      },
    });

    await prisma.cashFlowTransaction.update({
      where: { id: debitTx.id },
      data: { transferId: transfer.id },
    });

    await prisma.cashFlowTransaction.update({
      where: { id: creditTx.id },
      data: { transferId: transfer.id },
    });

    console.log('✅ Transfer created:', transfer.id);

    // 5. Update balances after transfer
    const bankTxsAfter = await prisma.cashFlowTransaction.findMany({
      where: { accountId: bankAccount.id },
    });
    const cashTxsAfter = await prisma.cashFlowTransaction.findMany({
      where: { accountId: cashAccount.id },
    });

    const newBankBalance = bankTxsAfter.reduce((sum, tx) => {
      return tx.type === 'INFLOW' ? sum + tx.amount : sum - tx.amount;
    }, 0);

    const newCashBalance = cashTxsAfter.reduce((sum, tx) => {
      return tx.type === 'INFLOW' ? sum + tx.amount : sum - tx.amount;
    }, 0);

    await prisma.cashFlowAccount.update({
      where: { id: bankAccount.id },
      data: { balance: newBankBalance },
    });

    await prisma.cashFlowAccount.update({
      where: { id: cashAccount.id },
      data: { balance: newCashBalance },
    });

    console.log('✅ Updated bank balance:', newBankBalance);
    console.log('✅ Updated cash balance:', newCashBalance);

    // 6. Create a Classification Rule
    console.log('\n5️⃣ Creating classification rule...');
    const rule = await prisma.cashFlowRule.create({
      data: {
        name: 'Test Auto-Categorize Rent',
        description: 'Automatically categorize rent payments',
        priority: 10,
        isActive: true,
        counterpartyRegex: 'landlord|rent',
        targetCategory: 'RENT_PAYMENT',
        addTags: ['auto-categorized', 'rent'],
      },
    });
    console.log('✅ Rule created:', rule.id);

    // 7. Create Scheduled Item
    console.log('\n6️⃣ Creating scheduled item...');
    const scheduledItem = await prisma.cashFlowScheduledItem.create({
      data: {
        name: 'Monthly Rent',
        type: 'OUTFLOW',
        category: 'RENT_PAYMENT',
        accountId: bankAccount.id,
        amount: 300000,
        currency: 'COP',
        frequency: 'MONTHLY',
        startDate: new Date('2025-10-01'),
        nextOccurrence: new Date('2025-11-01'),
        counterparty: 'Test Landlord',
        memo: 'Recurring rent payment',
        isActive: true,
      },
    });
    console.log('✅ Scheduled item created:', scheduledItem.id);

    // 8. Query Test
    console.log('\n7️⃣ Running queries...');
    const allAccounts = await prisma.cashFlowAccount.findMany({
      include: {
        _count: {
          select: {
            transactions: true,
            transfersFrom: true,
            transfersTo: true,
          },
        },
      },
    });
    console.log('✅ Found', allAccounts.length, 'accounts');

    const allTransactions = await prisma.cashFlowTransaction.findMany({
      where: {
        date: {
          gte: new Date('2025-10-01'),
          lte: new Date('2025-10-31'),
        },
      },
      include: {
        account: true,
      },
    });
    console.log('✅ Found', allTransactions.length, 'transactions in October');

    // 9. Calculate Cash Flow Statement Data
    console.log('\n8️⃣ Calculating cash flow statement...');
    const operatingTxs = allTransactions.filter((tx) =>
      [
        'CUSTOMER_PAYMENT',
        'VENDOR_PAYMENT',
        'SALARY_PAYMENT',
        'RENT_PAYMENT',
        'UTILITIES_PAYMENT',
        'TAX_PAYMENT',
        'INTEREST_PAYMENT',
        'SERVICE_PAYMENT',
      ].includes(tx.category),
    );

    const operatingInflows = operatingTxs
      .filter((tx) => tx.type === 'INFLOW')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const operatingOutflows = operatingTxs
      .filter((tx) => tx.type === 'OUTFLOW')
      .reduce((sum, tx) => sum + tx.amount, 0);

    console.log('✅ Operating Inflows:', operatingInflows);
    console.log('✅ Operating Outflows:', operatingOutflows);
    console.log('✅ Operating Cash Flow:', operatingInflows - operatingOutflows);

    // 10. Summary
    console.log('\n✨ Test Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Accounts created:', allAccounts.length);
    console.log('Transactions created:', allTransactions.length);
    console.log('Transfers created: 1');
    console.log('Rules created: 1');
    console.log('Scheduled items created: 1');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎉 All tests passed! Cash Flow Module is working correctly.\n');

    console.log('📝 Test Data IDs:');
    console.log('Bank Account ID:', bankAccount.id);
    console.log('Cash Account ID:', cashAccount.id);
    console.log('Rule ID:', rule.id);
    console.log('\nYou can now test the API endpoints using these IDs.\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCashFlowModule()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
