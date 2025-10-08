# Cash Flow Module - API Documentation

## Base URL
```
http://localhost:3000/cash-flow
```

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## 📁 Accounts

### Create Account
**POST** `/accounts`

**Permissions:** ADMIN, MODERATOR

**Request Body:**
```json
{
  "name": "Main Bank Account",
  "accountType": "BANK",  // BANK | CASH | CREDIT_CARD | INVESTMENT | LOAN_RECEIVABLE | OTHER
  "currency": "COP",      // Optional, defaults to COP
  "balance": 0,           // Optional, defaults to 0
  "description": "Primary business account",  // Optional
  "metadata": {           // Optional custom fields
    "bankName": "Bancolombia",
    "accountNumber": "1234567890"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Main Bank Account",
  "accountType": "BANK",
  "currency": "COP",
  "balance": 0,
  "isActive": true,
  "description": "Primary business account",
  "metadata": { ... },
  "createdAt": "2025-10-07T...",
  "updatedAt": "2025-10-07T..."
}
```

---

### List Accounts
**GET** `/accounts`

**Permissions:** ADMIN, MODERATOR, USER

**Query Parameters:**
- `accountType` (string) - Filter by account type
- `currency` (string) - Filter by currency
- `isActive` (boolean) - Filter by active status
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 50)
- `sortBy` (string) - Sort field (default: name)
- `sortOrder` (string) - asc | desc (default: asc)

**Example:**
```
GET /accounts?accountType=BANK&isActive=true&page=1&limit=10
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Main Bank Account",
      "accountType": "BANK",
      "currency": "COP",
      "balance": 5000000,
      "isActive": true,
      "_count": {
        "transactions": 145,
        "transfersFrom": 12,
        "transfersTo": 8
      }
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### Get Account
**GET** `/accounts/:id`

**Permissions:** ADMIN, MODERATOR, USER

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "Main Bank Account",
  "accountType": "BANK",
  "currency": "COP",
  "balance": 5000000,
  "isActive": true,
  "description": "Primary business account",
  "metadata": { ... },
  "_count": {
    "transactions": 145,
    "transfersFrom": 12,
    "transfersTo": 8
  },
  "createdAt": "2025-10-07T...",
  "updatedAt": "2025-10-07T..."
}
```

---

### Get Account Balance
**GET** `/accounts/:id/balance`

**Permissions:** ADMIN, MODERATOR, USER

**Query Parameters:**
- `asOfDate` (string) - Optional ISO date (YYYY-MM-DD) for historical balance

**Example:**
```
GET /accounts/uuid/balance?asOfDate=2025-09-30
```

**Response:** `200 OK`
```json
{
  "accountId": "uuid",
  "balance": 5000000,
  "asOfDate": "2025-09-30T00:00:00.000Z"
}
```

---

### Update Account
**PUT** `/accounts/:id`

**Permissions:** ADMIN, MODERATOR

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Account Name",
  "isActive": false,
  "description": "Updated description",
  "metadata": { ... }
}
```

**Response:** `200 OK` - Returns updated account

---

### Delete Account
**DELETE** `/accounts/:id`

**Permissions:** ADMIN

**Response:** `200 OK` - Returns deleted account

**Error:** `400 Bad Request` if account has transactions
```json
{
  "statusCode": 400,
  "message": "Cannot delete account with 145 transactions. Archive it instead."
}
```

---

## 💸 Transactions

### Create Transaction
**POST** `/transactions`

**Permissions:** ADMIN, MODERATOR

**Request Body:**
```json
{
  "idempotencyKey": "unique-tx-key-123",  // Required for duplicate prevention
  "accountId": "uuid",                     // Required
  "type": "INFLOW",                        // INFLOW | OUTFLOW
  "category": "CUSTOMER_PAYMENT",          // See categories list
  "amount": 500000,                        // Required, positive number
  "currency": "COP",                       // Optional, defaults to COP
  "date": "2025-10-07",                    // Required, ISO date
  "counterparty": "Customer ABC",          // Optional
  "memo": "Payment for invoice #123",      // Optional
  "reference": "INV-123",                  // Optional
  "tags": ["invoice", "recurring"],        // Optional
  "attachmentUrls": [                      // Optional
    "https://example.com/receipt.pdf"
  ],
  "metadata": {                            // Optional custom fields
    "invoiceId": "INV-123",
    "customField": "value"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "idempotencyKey": "unique-tx-key-123",
  "accountId": "uuid",
  "type": "INFLOW",
  "category": "CUSTOMER_PAYMENT",
  "amount": 500000,
  "currency": "COP",
  "date": "2025-10-07T00:00:00.000Z",
  "counterparty": "Customer ABC",
  "memo": "Payment for invoice #123",
  "reference": "INV-123",
  "tags": ["invoice", "recurring"],
  "attachmentUrls": ["https://example.com/receipt.pdf"],
  "metadata": { ... },
  "isReconciled": false,
  "reconciledAt": null,
  "transferId": null,
  "createdById": "user-uuid",
  "createdAt": "2025-10-07T...",
  "updatedAt": "2025-10-07T...",
  "account": {
    "id": "uuid",
    "name": "Main Bank Account",
    "accountType": "BANK",
    "currency": "COP"
  }
}
```

**Idempotency:** If called again with the same `idempotencyKey`, returns existing transaction (no duplicate created).

---

### Create Batch Transactions
**POST** `/transactions/batch`

**Permissions:** ADMIN, MODERATOR

**Request Body:**
```json
{
  "transactions": [
    {
      "idempotencyKey": "tx-1",
      "accountId": "uuid",
      "type": "INFLOW",
      "category": "CUSTOMER_PAYMENT",
      "amount": 100000,
      "date": "2025-10-07"
    },
    {
      "idempotencyKey": "tx-2",
      "accountId": "uuid",
      "type": "OUTFLOW",
      "category": "RENT_PAYMENT",
      "amount": 50000,
      "date": "2025-10-07"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "results": [
    {
      "success": true,
      "transaction": { ... }
    },
    {
      "success": true,
      "transaction": { ... }
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

---

### List Transactions
**GET** `/transactions`

**Permissions:** ADMIN, MODERATOR, USER

**Query Parameters:**
- `accountId` (string) - Filter by account
- `counterparty` (string) - Filter by counterparty (partial match)
- `category` (string) - Filter by category
- `currency` (string) - Filter by currency
- `amountMin` (number) - Minimum amount
- `amountMax` (number) - Maximum amount
- `dateFrom` (string) - Start date (ISO format)
- `dateTo` (string) - End date (ISO format)
- `search` (string) - Free text search (memo, counterparty, reference)
- `isReconciled` (boolean) - Filter by reconciliation status
- `tags` (array) - Filter by tags (comma-separated)
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 50)
- `sortBy` (string) - Sort field (default: date)
- `sortOrder` (string) - asc | desc (default: desc)

**Example:**
```
GET /transactions?accountId=uuid&category=CUSTOMER_PAYMENT&dateFrom=2025-10-01&dateTo=2025-10-31&search=invoice&page=1&limit=20
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "INFLOW",
      "category": "CUSTOMER_PAYMENT",
      "amount": 500000,
      "currency": "COP",
      "date": "2025-10-07T00:00:00.000Z",
      "counterparty": "Customer ABC",
      "memo": "Payment for invoice #123",
      "tags": ["invoice"],
      "account": {
        "id": "uuid",
        "name": "Main Bank Account",
        "accountType": "BANK",
        "currency": "COP"
      }
    }
  ],
  "pagination": {
    "total": 145,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

### Get Transaction
**GET** `/transactions/:id`

**Permissions:** ADMIN, MODERATOR, USER

**Response:** `200 OK` - Returns full transaction details with account

---

### Update Transaction
**PUT** `/transactions/:id`

**Permissions:** ADMIN, MODERATOR

**Request Body:** (all fields optional, amounts cannot be changed)
```json
{
  "counterparty": "Updated Name",
  "memo": "Updated memo",
  "category": "OTHER",
  "tags": ["new-tag"],
  "attachmentUrls": ["https://example.com/new.pdf"],
  "metadata": { ... }
}
```

**Response:** `200 OK` - Returns updated transaction

---

### Delete Transaction
**DELETE** `/transactions/:id`

**Permissions:** ADMIN

**Response:** `200 OK` - Returns deleted transaction

**Error:** `400 Bad Request` if transaction is part of a transfer

---

## 🔄 Transfers

### Create Transfer
**POST** `/transfers`

**Permissions:** ADMIN, MODERATOR

**Request Body:**
```json
{
  "idempotencyKey": "transfer-unique-key-456",
  "fromAccountId": "bank-account-uuid",
  "toAccountId": "cash-account-uuid",
  "amount": 200000,
  "currency": "COP",
  "date": "2025-10-07",
  "memo": "Cash withdrawal for expenses",
  "metadata": {
    "purpose": "Petty cash replenishment"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "idempotencyKey": "transfer-unique-key-456",
  "fromAccountId": "uuid",
  "toAccountId": "uuid",
  "amount": 200000,
  "currency": "COP",
  "date": "2025-10-07T00:00:00.000Z",
  "memo": "Cash withdrawal for expenses",
  "metadata": { ... },
  "debitTxId": "tx-uuid-1",
  "creditTxId": "tx-uuid-2",
  "createdById": "user-uuid",
  "createdAt": "2025-10-07T...",
  "updatedAt": "2025-10-07T...",
  "fromAccount": {
    "id": "uuid",
    "name": "Main Bank Account",
    "accountType": "BANK",
    "currency": "COP"
  },
  "toAccount": {
    "id": "uuid",
    "name": "Petty Cash",
    "accountType": "CASH",
    "currency": "COP"
  }
}
```

**Note:** Creates two linked transactions automatically:
1. OUTFLOW from `fromAccount` (debit)
2. INFLOW to `toAccount` (credit)

---

### List Transfers
**GET** `/transfers`

**Permissions:** ADMIN, MODERATOR, USER

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 50)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "amount": 200000,
      "currency": "COP",
      "date": "2025-10-07T00:00:00.000Z",
      "memo": "Cash withdrawal",
      "fromAccount": { ... },
      "toAccount": { ... }
    }
  ],
  "pagination": {
    "total": 12,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

---

### Get Transfer
**GET** `/transfers/:id`

**Permissions:** ADMIN, MODERATOR, USER

**Response:** `200 OK` - Returns full transfer details with both accounts

---

### Delete Transfer
**DELETE** `/transfers/:id`

**Permissions:** ADMIN

**Response:** `200 OK` - Returns deleted transfer

**Note:** Automatically deletes both linked transactions and updates account balances.

---

## 📋 Classification Rules

### Create Rule
**POST** `/rules`

**Permissions:** ADMIN, MODERATOR

**Request Body:**
```json
{
  "name": "Classify Rent Payments",
  "description": "Auto-categorize transactions to landlord",
  "priority": 10,                    // Higher = applied first
  "isActive": true,                  // Optional, defaults to true
  
  // Matching Conditions (all optional, AND logic)
  "accountIds": ["uuid1", "uuid2"],  // Match specific accounts
  "counterpartyRegex": "landlord|rent|arrendamiento",
  "memoRegex": "rent|alquiler",
  "amountMin": 100000,
  "amountMax": 500000,
  "categories": ["OTHER"],           // Match current categories
  
  // Actions (at least one required)
  "targetCategory": "RENT_PAYMENT",
  "targetCounterparty": "Landlord Corp",
  "addTags": ["rent", "recurring"],
  
  "metadata": {
    "createdBy": "automation"
  }
}
```

**Response:** `201 Created` - Returns created rule

---

### List Rules
**GET** `/rules`

**Permissions:** ADMIN, MODERATOR, USER

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Classify Rent Payments",
    "description": "Auto-categorize transactions to landlord",
    "priority": 10,
    "isActive": true,
    "accountIds": [],
    "counterpartyRegex": "landlord|rent",
    "memoRegex": null,
    "amountMin": null,
    "amountMax": null,
    "categories": [],
    "targetCategory": "RENT_PAYMENT",
    "targetCounterparty": null,
    "addTags": ["rent", "recurring"],
    "metadata": { ... },
    "createdAt": "2025-10-07T...",
    "updatedAt": "2025-10-07T..."
  }
]
```

**Note:** Ordered by priority (descending) then name (ascending)

---

### Get Rule
**GET** `/rules/:id`

**Permissions:** ADMIN, MODERATOR, USER

**Response:** `200 OK` - Returns full rule details

---

### Dry Run Rule
**POST** `/rules/dry-run`

**Permissions:** ADMIN, MODERATOR

**Request Body:**
```json
{
  "ruleId": "rule-uuid",
  "transactionIds": ["tx-uuid-1", "tx-uuid-2", "tx-uuid-3"]
}
```

**Response:** `200 OK`
```json
{
  "rule": {
    "id": "rule-uuid",
    "name": "Classify Rent Payments"
  },
  "results": [
    {
      "transactionId": "tx-uuid-1",
      "matched": true,
      "currentData": {
        "category": "OTHER",
        "counterparty": "Landlord",
        "tags": []
      },
      "proposedChanges": {
        "category": "RENT_PAYMENT",
        "tags": ["rent", "recurring"]
      }
    },
    {
      "transactionId": "tx-uuid-2",
      "matched": false,
      "currentData": { ... },
      "proposedChanges": null
    }
  ],
  "summary": {
    "total": 3,
    "matched": 1,
    "noMatch": 2
  }
}
```

---

### Apply Rules to Transaction
**POST** `/rules/apply/:transactionId`

**Permissions:** ADMIN, MODERATOR

**Response:** `200 OK` - Returns updated transaction with applied rules

**Note:** Applies all active rules in priority order. Stops at first match.

---

### Update Rule
**PUT** `/rules/:id`

**Permissions:** ADMIN, MODERATOR

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Rule Name",
  "priority": 20,
  "isActive": false,
  "targetCategory": "OTHER"
}
```

**Response:** `200 OK` - Returns updated rule

---

### Delete Rule
**DELETE** `/rules/:id`

**Permissions:** ADMIN

**Response:** `200 OK` - Returns deleted rule

---

## 📊 Reports

### Generate Cash Flow Statement
**POST** `/reports/cash-flow-statement`

**Permissions:** ADMIN, MODERATOR, USER

**Request Body:**
```json
{
  "startDate": "2025-01-01",           // Required, ISO date
  "endDate": "2025-12-31",             // Required, ISO date
  "accountId": "uuid",                 // Optional, filter by account
  "currency": "COP",                   // Optional, defaults to COP
  "format": "JSON"                     // JSON | CSV | PDF
}
```

**Response:** `200 OK` (format=JSON)
```json
{
  "period": {
    "startDate": "2025-01-01",
    "endDate": "2025-12-31"
  },
  "currency": "COP",
  "operatingActivities": {
    "inflows": 5000000,
    "outflows": 2000000,
    "net": 3000000,
    "transactions": [ ... ]
  },
  "investingActivities": {
    "inflows": 1000000,
    "outflows": 500000,
    "net": 500000,
    "transactions": [ ... ]
  },
  "financingActivities": {
    "inflows": 2000000,
    "outflows": 1000000,
    "net": 1000000,
    "transactions": [ ... ]
  },
  "summary": {
    "totalInflows": 8000000,
    "totalOutflows": 3500000,
    "netCashFlow": 4500000,
    "operatingCashFlow": 3000000,
    "investingCashFlow": 500000,
    "financingCashFlow": 1000000
  }
}
```

**Response:** `200 OK` (format=CSV)
```json
{
  "format": "CSV",
  "content": "Cash Flow Statement\nPeriod,2025-01-01 to 2025-12-31\n...",
  "filename": "cash_flow_statement_2025-10-07.csv"
}
```

**Response:** `200 OK` (format=PDF)
```json
{
  "format": "PDF",
  "status": "not_implemented",
  "message": "PDF generation should be integrated with existing PDF renderer service...",
  "data": { ... }
}
```

**Error:** `422 Unprocessable Entity` (multi-currency without exchange rates)
```json
{
  "statusCode": 422,
  "message": "Missing exchange rate from USD to COP. Please add exchange rate data before generating multi-currency reports."
}
```

---

### Generate Forecast
**POST** `/reports/forecast`

**Permissions:** ADMIN, MODERATOR, USER

**Request Body:**
```json
{
  "weeks": 13,                         // Optional, defaults to 13
  "accountId": "uuid",                 // Optional, forecast all if omitted
  "scenario": "BASE",                  // BASE | BEST | WORST
  "scenarioDeltaPercent": 10           // Optional, defaults to 10
}
```

**Response:** `200 OK`
```json
{
  "scenario": "BASE",
  "weeks": 13,
  "generatedAt": "2025-10-07T...",
  "currentBalance": 5000000,
  "forecast": [
    {
      "week": 1,
      "weekStart": "2025-10-07",
      "weekEnd": "2025-10-13",
      "projectedInflows": 800000,
      "projectedOutflows": 400000,
      "netCashFlow": 400000,
      "endingBalance": 5400000,
      "scheduledItems": 5
    },
    {
      "week": 2,
      "weekStart": "2025-10-14",
      "weekEnd": "2025-10-20",
      "projectedInflows": 750000,
      "projectedOutflows": 450000,
      "netCashFlow": 300000,
      "endingBalance": 5700000,
      "scheduledItems": 3
    }
    // ... 11 more weeks
  ],
  "summary": {
    "totalProjectedInflows": 10400000,
    "totalProjectedOutflows": 5850000,
    "averageWeeklyInflows": 800000,
    "averageWeeklyOutflows": 450000,
    "finalProjectedBalance": 9550000
  }
}
```

---

## 📝 Transaction Categories

### Operating Activities
- `CUSTOMER_PAYMENT` - Payments received from customers
- `VENDOR_PAYMENT` - Payments to vendors/suppliers
- `SALARY_PAYMENT` - Employee salaries
- `RENT_PAYMENT` - Rent payments
- `UTILITIES_PAYMENT` - Utilities (electricity, water, etc.)
- `TAX_PAYMENT` - Tax payments
- `INTEREST_PAYMENT` - Interest paid
- `SERVICE_PAYMENT` - Service fees

### Investing Activities
- `ASSET_PURCHASE` - Purchase of assets
- `ASSET_SALE` - Sale of assets
- `INVESTMENT_PURCHASE` - Purchase of investments
- `INVESTMENT_SALE` - Sale of investments
- `LOAN_DISBURSEMENT` - Money lent out
- `LOAN_REPAYMENT_RECEIVED` - Loan repayment received

### Financing Activities
- `EQUITY_INJECTION` - Capital injection
- `EQUITY_WITHDRAWAL` - Owner withdrawals
- `LOAN_RECEIVED` - Loan received
- `LOAN_REPAYMENT_MADE` - Loan repayment made
- `DIVIDEND_PAYMENT` - Dividends paid

### Other
- `TRANSFER` - Inter-account transfer
- `ADJUSTMENT` - Balance adjustment
- `OTHER` - Uncategorized

---

## 🔐 Error Codes

- `400 Bad Request` - Invalid input or business rule violation
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource (shouldn't happen with idempotency)
- `422 Unprocessable Entity` - Missing prerequisites (e.g., exchange rates)
- `500 Internal Server Error` - Server error

---

## 💡 Best Practices

1. **Always use idempotencyKey** for transactions and transfers
2. **Use descriptive counterparty names** for better reporting
3. **Add relevant tags** for easier filtering
4. **Set up classification rules** to automate categorization
5. **Test rules with dry-run** before applying
6. **Use transfers** for moving money between accounts
7. **Archive accounts** instead of deleting
8. **Add exchange rates** before multi-currency operations
9. **Regularly generate forecasts** for cash planning
10. **Use metadata fields** for custom integrations

---

## 📌 Rate Limiting

Standard rate limits apply:
- 100 requests per minute per user
- 1000 requests per hour per user

Batch operations count as 1 request regardless of batch size.

---

For more information, see:
- [README.md](./README.md) - Module overview
- [QUICK_START.md](./QUICK_START.md) - Getting started guide
- Prisma Schema - Database models documentation
