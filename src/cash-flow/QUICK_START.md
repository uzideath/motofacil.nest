# Cash Flow Module - Quick Start Guide

## Installation Steps

### 1. Database Migration

The Prisma schema has been updated with new cash flow models. Run the migration:

```powershell
# Navigate to the API directory
cd C:\Users\uzi\Documents\Dev\motoapp.api.nest

# Generate Prisma Client
pnpm prisma generate

# Create and apply migration
pnpm prisma migrate dev --name add_cash_flow_module
```

### 2. Verify Module Registration

The `CashFlowModule` has been added to `app.module.ts`. No additional configuration needed.

### 3. Start the Server

```powershell
pnpm run dev
```

## Initial Setup

### Step 1: Create Your First Account

```bash
curl -X POST http://localhost:3000/cash-flow/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Main Bank Account",
    "accountType": "BANK",
    "currency": "COP",
    "balance": 0,
    "description": "Primary business bank account"
  }'
```

### Step 2: Record Your First Transaction

```bash
curl -X POST http://localhost:3000/cash-flow/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "idempotencyKey": "tx-2025-10-07-001",
    "accountId": "YOUR_ACCOUNT_ID",
    "type": "INFLOW",
    "category": "CUSTOMER_PAYMENT",
    "amount": 500000,
    "currency": "COP",
    "date": "2025-10-07",
    "counterparty": "Customer Name",
    "memo": "Payment for services"
  }'
```

### Step 3: Create a Classification Rule

```bash
curl -X POST http://localhost:3000/cash-flow/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Categorize Salary Payments",
    "description": "Auto-tag salary transactions",
    "priority": 10,
    "memoRegex": "salary|salario|nomina",
    "targetCategory": "SALARY_PAYMENT",
    "addTags": ["payroll", "recurring"]
  }'
```

### Step 4: Generate Your First Report

```bash
curl -X POST http://localhost:3000/cash-flow/reports/cash-flow-statement \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "currency": "COP",
    "format": "JSON"
  }'
```

## Testing with Sample Data

Create a test script to populate sample data:

```typescript
// test-cash-flow.ts
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function seedCashFlow() {
  // Create accounts
  const bankAccount = await prisma.cashFlowAccount.create({
    data: {
      name: 'Business Bank Account',
      accountType: 'BANK',
      currency: 'COP',
      balance: 0,
    },
  });

  const cashAccount = await prisma.cashFlowAccount.create({
    data: {
      name: 'Petty Cash',
      accountType: 'CASH',
      currency: 'COP',
      balance: 0,
    },
  });

  // Create sample transactions
  const transactions = [
    {
      idempotencyKey: 'sample-tx-1',
      accountId: bankAccount.id,
      type: 'INFLOW',
      category: 'CUSTOMER_PAYMENT',
      amount: 1000000,
      currency: 'COP',
      date: new Date('2025-10-01'),
      counterparty: 'ABC Corp',
      memo: 'Monthly service payment',
    },
    {
      idempotencyKey: 'sample-tx-2',
      accountId: bankAccount.id,
      type: 'OUTFLOW',
      category: 'RENT_PAYMENT',
      amount: 300000,
      currency: 'COP',
      date: new Date('2025-10-05'),
      counterparty: 'Landlord',
      memo: 'Office rent',
    },
    {
      idempotencyKey: 'sample-tx-3',
      accountId: bankAccount.id,
      type: 'OUTFLOW',
      category: 'SALARY_PAYMENT',
      amount: 500000,
      currency: 'COP',
      date: new Date('2025-10-07'),
      counterparty: 'Employees',
      memo: 'Monthly salaries',
    },
  ];

  for (const tx of transactions) {
    await prisma.cashFlowTransaction.create({ data: tx });
  }

  // Update balances
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

  console.log('Sample data created successfully!');
  console.log('Bank Account ID:', bankAccount.id);
  console.log('Cash Account ID:', cashAccount.id);
  console.log('Bank Balance:', bankBalance);
}

seedCashFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run the seed script:

```powershell
npx tsx test-cash-flow.ts
```

## API Endpoints Overview

All endpoints are available at: `http://localhost:3000/cash-flow/...`

### Accounts
- `POST /accounts` - Create
- `GET /accounts` - List (with filters)
- `GET /accounts/:id` - Get one
- `GET /accounts/:id/balance` - Get balance
- `PUT /accounts/:id` - Update
- `DELETE /accounts/:id` - Delete

### Transactions
- `POST /transactions` - Create one
- `POST /transactions/batch` - Create many
- `GET /transactions` - List (with advanced filters)
- `GET /transactions/:id` - Get one
- `PUT /transactions/:id` - Update
- `DELETE /transactions/:id` - Delete

### Transfers
- `POST /transfers` - Create
- `GET /transfers` - List
- `GET /transfers/:id` - Get one
- `DELETE /transfers/:id` - Delete

### Rules
- `POST /rules` - Create
- `GET /rules` - List
- `GET /rules/:id` - Get one
- `POST /rules/dry-run` - Test rule
- `POST /rules/apply/:transactionId` - Apply rules
- `PUT /rules/:id` - Update
- `DELETE /rules/:id` - Delete

### Reports
- `POST /reports/cash-flow-statement` - Generate statement
- `POST /reports/forecast` - Generate 13-week forecast

## Common Use Cases

### Use Case 1: Daily Transaction Recording

```typescript
// Record a customer payment
POST /cash-flow/transactions
{
  "idempotencyKey": "payment-2025-10-07-customer-123",
  "accountId": "bank-account-id",
  "type": "INFLOW",
  "category": "CUSTOMER_PAYMENT",
  "amount": 250000,
  "date": "2025-10-07",
  "counterparty": "Customer #123",
  "memo": "Invoice #ABC-001 payment",
  "tags": ["invoice", "customer-123"]
}
```

### Use Case 2: Inter-Account Transfer

```typescript
// Transfer money from bank to cash
POST /cash-flow/transfers
{
  "idempotencyKey": "transfer-2025-10-07-001",
  "fromAccountId": "bank-account-id",
  "toAccountId": "cash-account-id",
  "amount": 100000,
  "date": "2025-10-07",
  "memo": "Petty cash replenishment"
}
```

### Use Case 3: Monthly Cash Flow Report

```typescript
// Generate October 2025 report
POST /cash-flow/reports/cash-flow-statement
{
  "startDate": "2025-10-01",
  "endDate": "2025-10-31",
  "format": "CSV"
}
```

### Use Case 4: Liquidity Forecast

```typescript
// 13-week forecast with worst-case scenario
POST /cash-flow/reports/forecast
{
  "weeks": 13,
  "scenario": "WORST",
  "scenarioDeltaPercent": 15
}
```

## Troubleshooting

### Error: "Missing exchange rate"

**Solution**: Add exchange rate data if using multiple currencies:

```sql
INSERT INTO "ExchangeRate" ("id", "fromCurrency", "toCurrency", "rate", "effectiveDate", "source")
VALUES (gen_random_uuid(), 'USD', 'COP', 4200.00, NOW(), 'manual');
```

### Error: "Cannot delete account with transactions"

**Solution**: Archive the account instead:

```typescript
PUT /cash-flow/accounts/:id
{
  "isActive": false
}
```

### Error: "Duplicate transaction"

**Solution**: This is expected! The idempotencyKey prevents duplicates. The existing transaction is returned.

## Next Steps

1. ✅ Run migrations
2. ✅ Create your first account
3. ✅ Record some transactions
4. ✅ Set up classification rules
5. ✅ Generate your first cash flow statement
6. ✅ Try the forecast feature
7. 🔄 Integrate with frontend
8. 🔄 Set up scheduled reports
9. 🔄 Customize PDF templates (using your existing Puppeteer service)

## Integration with Existing Features

### Link with Loans
You can link cash flow transactions to existing loan payments:

```typescript
// Record loan payment as cash flow transaction
POST /cash-flow/transactions
{
  "idempotencyKey": "loan-payment-loan-id-date",
  "accountId": "bank-account-id",
  "type": "OUTFLOW",
  "category": "LOAN_REPAYMENT_MADE",
  "amount": installmentAmount,
  "date": paymentDate,
  "counterparty": "Loan Provider",
  "memo": `Loan ${loanId} - Installment ${installmentNumber}`,
  "metadata": {
    "loanId": loanId,
    "installmentId": installmentId
  }
}
```

### Link with Expenses
Similarly, link existing expenses:

```typescript
// Record expense as cash flow transaction
POST /cash-flow/transactions
{
  "idempotencyKey": `expense-${expenseId}`,
  "accountId": "account-id",
  "type": "OUTFLOW",
  "category": mapExpenseCategory(expense.category),
  "amount": expense.amount,
  "date": expense.date,
  "counterparty": expense.beneficiary,
  "memo": expense.description,
  "metadata": {
    "expenseId": expense.id,
    "providerId": expense.providerId
  }
}
```

## Production Checklist

Before deploying to production:

- [ ] Run migrations on production database
- [ ] Set up database backups
- [ ] Configure proper role-based access
- [ ] Add rate limiting to API endpoints
- [ ] Set up monitoring and alerts
- [ ] Test idempotency thoroughly
- [ ] Add exchange rate data source
- [ ] Configure scheduled report generation
- [ ] Set up audit logging
- [ ] Review and optimize database indexes

## Support

For questions or issues:
1. Check the main README.md
2. Review inline code documentation
3. Check Prisma schema comments
4. Contact the development team

Happy cash flowing! 💰📊
