# Cash Flow Module

A comprehensive, production-ready cash flow management system for tracking, categorizing, and forecasting financial transactions.

## Features

### ✅ A. Accounts Management
- Create and manage multiple cash flow accounts (Bank, Cash, Credit Card, Investment, Loan Receivable, Other)
- Multi-currency support with exchange rate awareness
- Real-time balance calculation
- Account archiving (soft delete)

**Endpoints:**
- `POST /cash-flow/accounts` - Create account
- `GET /cash-flow/accounts` - List accounts with filtering, pagination, sorting
- `GET /cash-flow/accounts/:id` - Get account details
- `GET /cash-flow/accounts/:id/balance` - Get current or historical balance
- `PUT /cash-flow/accounts/:id` - Update account
- `DELETE /cash-flow/accounts/:id` - Delete account (only if no transactions)

### ✅ B. Cash Transactions
- Idempotent transaction creation (prevents duplicates)
- Batch transaction ingestion
- Full transaction metadata (tags, attachments, custom fields)
- Comprehensive querying with filters:
  - Account, counterparty, category, currency
  - Amount range, date range
  - Free text search (memo, counterparty, reference)
  - Reconciliation status
  - Tag filtering

**Endpoints:**
- `POST /cash-flow/transactions` - Create single transaction
- `POST /cash-flow/transactions/batch` - Create multiple transactions (idempotent)
- `GET /cash-flow/transactions` - List/query with advanced filters
- `GET /cash-flow/transactions/:id` - Get transaction details
- `PUT /cash-flow/transactions/:id` - Update metadata (non-destructive)
- `DELETE /cash-flow/transactions/:id` - Delete transaction

### ✅ C. Transfers
- Intra-account and inter-account transfers
- Automatic two-leg accounting (debit/credit)
- Linked transactions for elimination in reports
- Idempotency-Key prevents duplicates
- Automatic balance updates

**Endpoints:**
- `POST /cash-flow/transfers` - Create transfer
- `GET /cash-flow/transfers` - List transfers
- `GET /cash-flow/transfers/:id` - Get transfer details
- `DELETE /cash-flow/transfers/:id` - Delete transfer (cascades to transactions)

### ✅ D. Classification Rules
- Auto-classification rules for transactions
- Multiple matching conditions:
  - Account IDs
  - Counterparty regex
  - Memo regex
  - Amount ranges
  - Existing categories
- Multiple actions:
  - Set target category
  - Set counterparty
  - Add tags
- Priority-based rule ordering
- Dry-run endpoint for testing

**Endpoints:**
- `POST /cash-flow/rules` - Create rule
- `GET /cash-flow/rules` - List all rules (ordered by priority)
- `GET /cash-flow/rules/:id` - Get rule details
- `POST /cash-flow/rules/dry-run` - Test rule on sample transactions
- `POST /cash-flow/rules/apply/:transactionId` - Apply rules to specific transaction
- `PUT /cash-flow/rules/:id` - Update rule
- `DELETE /cash-flow/rules/:id` - Delete rule

### ✅ E. Cash Flow Statement (Reporting)
- Standard cash flow statement with three sections:
  - Operating Activities
  - Investing Activities
  - Financing Activities
- Drill-through to underlying transactions
- Multi-currency aware with exchange rate validation
- Period-based reporting (any date range)
- Multiple export formats:
  - JSON (default)
  - CSV
  - PDF (integration ready with existing Puppeteer service)

**Endpoints:**
- `POST /cash-flow/reports/cash-flow-statement` - Generate cash flow statement

**Request Body:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-03-31",
  "accountId": "optional-account-id",
  "currency": "COP",
  "format": "JSON" // or "CSV" or "PDF"
}
```

### ✅ F. Forecast (13-Week Liquidity Projection)
- Lightweight 13-week cash flow forecast
- Uses scheduled items + historical patterns
- Three scenarios:
  - BASE: Current trends
  - BEST: +10% optimistic
  - WORST: -10% pessimistic
- Configurable scenario delta percentage
- Weekly projections with ending balances

**Endpoints:**
- `POST /cash-flow/reports/forecast` - Generate forecast

**Request Body:**
```json
{
  "weeks": 13,
  "accountId": "optional-account-id",
  "scenario": "BASE", // or "BEST" or "WORST"
  "scenarioDeltaPercent": 10
}
```

## Data Models

### CashFlowAccount
- Multi-currency accounts
- Account types: BANK, CASH, CREDIT_CARD, INVESTMENT, LOAN_RECEIVABLE, OTHER
- Real-time balance tracking

### CashFlowTransaction
- Full transaction details with idempotency
- Type: INFLOW or OUTFLOW
- 20+ predefined categories (Operating/Investing/Financing)
- Tags, attachments, custom metadata
- Reconciliation status

### CashFlowTransfer
- Links two transactions (debit + credit)
- Automatic elimination in reports
- Idempotency protection

### CashFlowRule
- Priority-based auto-classification
- Regex matching on counterparty and memo
- Amount range filtering
- Multiple actions per rule

### CashFlowScheduledItem
- Recurring transaction patterns
- Frequencies: DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY
- Used in forecasting

### ExchangeRate
- Multi-currency support
- Historical exchange rates
- Automatic validation in reports

## Categories

### Operating Activities
- CUSTOMER_PAYMENT
- VENDOR_PAYMENT
- SALARY_PAYMENT
- RENT_PAYMENT
- UTILITIES_PAYMENT
- TAX_PAYMENT
- INTEREST_PAYMENT
- SERVICE_PAYMENT

### Investing Activities
- ASSET_PURCHASE
- ASSET_SALE
- INVESTMENT_PURCHASE
- INVESTMENT_SALE
- LOAN_DISBURSEMENT
- LOAN_REPAYMENT_RECEIVED

### Financing Activities
- EQUITY_INJECTION
- EQUITY_WITHDRAWAL
- LOAN_RECEIVED
- LOAN_REPAYMENT_MADE
- DIVIDEND_PAYMENT

### Other
- TRANSFER
- ADJUSTMENT
- OTHER

## Security & Permissions

All endpoints are protected with role-based access control:

- **ADMIN**: Full access (create, read, update, delete)
- **MODERATOR**: Create, read, update (no delete except own data)
- **USER**: Read-only access to reports

## Usage Examples

### 1. Create an Account
```bash
POST /cash-flow/accounts
{
  "name": "Main Business Account",
  "accountType": "BANK",
  "currency": "COP",
  "balance": 10000000,
  "description": "Primary operating account"
}
```

### 2. Record a Transaction (Idempotent)
```bash
POST /cash-flow/transactions
{
  "idempotencyKey": "unique-key-123",
  "accountId": "account-id",
  "type": "INFLOW",
  "category": "CUSTOMER_PAYMENT",
  "amount": 500000,
  "currency": "COP",
  "date": "2025-10-07",
  "counterparty": "Customer ABC",
  "memo": "Payment for invoice #123",
  "tags": ["invoice", "recurring-customer"]
}
```

### 3. Create a Transfer
```bash
POST /cash-flow/transfers
{
  "idempotencyKey": "transfer-unique-456",
  "fromAccountId": "bank-account-id",
  "toAccountId": "cash-account-id",
  "amount": 200000,
  "currency": "COP",
  "date": "2025-10-07",
  "memo": "Cash withdrawal for expenses"
}
```

### 4. Create Auto-Classification Rule
```bash
POST /cash-flow/rules
{
  "name": "Classify Rent Payments",
  "description": "Auto-categorize transactions to landlord",
  "priority": 10,
  "counterpartyRegex": "landlord|rent|arrendamiento",
  "targetCategory": "RENT_PAYMENT",
  "addTags": ["rent", "recurring"]
}
```

### 5. Generate Cash Flow Statement
```bash
POST /cash-flow/reports/cash-flow-statement
{
  "startDate": "2025-01-01",
  "endDate": "2025-03-31",
  "currency": "COP",
  "format": "JSON"
}
```

### 6. Generate 13-Week Forecast
```bash
POST /cash-flow/reports/forecast
{
  "weeks": 13,
  "scenario": "BASE"
}
```

## Integration with Existing System

The cash flow module integrates seamlessly with your existing:

- **Authentication**: Uses existing JWT guards and role decorators
- **Database**: Extends your Prisma schema
- **PDF Generation**: Ready for integration with your Puppeteer-based receipt/closing PDF service
- **User Management**: Links to existing Owners model

## Explicitly Out of Scope

The following features are **intentionally excluded** as per requirements:

- ❌ Bank feeds integration
- ❌ Statement ingestion/import
- ❌ Reconciliation workflows (match/unmatch)
- ❌ Unreconciled reports
- ❌ Manual bank statement matching

## Database Migration

After creating the module, run:

```bash
# Generate Prisma Client
pnpm prisma generate

# Create migration
pnpm prisma migrate dev --name add_cash_flow_module

# Or if already in production
pnpm prisma migrate deploy
```

## Performance Considerations

- **Indexes**: Applied on frequently queried fields (accountId, date, category, counterparty)
- **Pagination**: All list endpoints support pagination
- **Batch Operations**: Batch transaction creation for bulk imports
- **Balance Caching**: Account balances cached and updated transactionally

## Best Practices

1. **Always use idempotencyKey** to prevent duplicate transactions
2. **Set appropriate priorities** for rules (higher = applied first)
3. **Test rules with dry-run** before applying
4. **Use transfers** for inter-account movements (not separate transactions)
5. **Add exchange rates** before generating multi-currency reports
6. **Archive accounts** instead of deleting (preserves history)

## Future Enhancements (Optional)

- Real-time webhooks for transaction events
- Scheduled report generation
- Automated rule suggestions based on ML
- Budget vs. actual comparisons
- Cash flow dashboards with charts
- Integration with external accounting systems
- Multi-tenant support

## Support

For issues or questions about the cash flow module, please contact the development team or refer to the inline code documentation.
