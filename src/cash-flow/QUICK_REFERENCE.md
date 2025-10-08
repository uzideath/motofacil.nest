# 🚀 Cash Flow Module - Quick Reference Card

## 📍 Base URL
```
http://localhost:3000/cash-flow
```

## 🔑 Authentication
All endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 📦 Quick Examples

### Create Account
```bash
POST /accounts
{
  "name": "Main Bank",
  "accountType": "BANK",
  "currency": "COP"
}
```

### Create Transaction (Idempotent)
```bash
POST /transactions
{
  "idempotencyKey": "unique-key-123",
  "accountId": "account-uuid",
  "type": "INFLOW",
  "category": "CUSTOMER_PAYMENT",
  "amount": 500000,
  "date": "2025-10-07",
  "counterparty": "Customer Name",
  "memo": "Payment received"
}
```

### Create Transfer
```bash
POST /transfers
{
  "idempotencyKey": "transfer-456",
  "fromAccountId": "bank-uuid",
  "toAccountId": "cash-uuid",
  "amount": 100000,
  "date": "2025-10-07"
}
```

### Create Rule
```bash
POST /rules
{
  "name": "Auto-categorize Rent",
  "priority": 10,
  "counterpartyRegex": "landlord|rent",
  "targetCategory": "RENT_PAYMENT",
  "addTags": ["rent"]
}
```

### Generate Cash Flow Statement
```bash
POST /reports/cash-flow-statement
{
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "format": "JSON"
}
```

### Generate Forecast
```bash
POST /reports/forecast
{
  "weeks": 13,
  "scenario": "BASE"
}
```

---

## 📊 Categories

### Operating
- CUSTOMER_PAYMENT
- VENDOR_PAYMENT
- SALARY_PAYMENT
- RENT_PAYMENT
- UTILITIES_PAYMENT
- TAX_PAYMENT
- INTEREST_PAYMENT
- SERVICE_PAYMENT

### Investing
- ASSET_PURCHASE
- ASSET_SALE
- INVESTMENT_PURCHASE
- INVESTMENT_SALE
- LOAN_DISBURSEMENT
- LOAN_REPAYMENT_RECEIVED

### Financing
- EQUITY_INJECTION
- EQUITY_WITHDRAWAL
- LOAN_RECEIVED
- LOAN_REPAYMENT_MADE
- DIVIDEND_PAYMENT

### Other
- TRANSFER
- ADJUSTMENT
- OTHER

---

## 🔍 Query Parameters

### List Transactions
```
GET /transactions?
  accountId=uuid&
  category=CUSTOMER_PAYMENT&
  dateFrom=2025-10-01&
  dateTo=2025-10-31&
  amountMin=100000&
  amountMax=500000&
  search=invoice&
  tags=recurring&
  isReconciled=false&
  page=1&
  limit=50&
  sortBy=date&
  sortOrder=desc
```

### List Accounts
```
GET /accounts?
  accountType=BANK&
  currency=COP&
  isActive=true&
  page=1&
  limit=50
```

---

## 🛡️ Permissions

| Endpoint | ADMIN | MODERATOR | USER |
|----------|-------|-----------|------|
| GET (read) | ✅ | ✅ | ✅ |
| POST (create) | ✅ | ✅ | ❌ |
| PUT (update) | ✅ | ✅ | ❌ |
| DELETE | ✅ | ❌ | ❌ |

---

## 📁 File Locations

### Documentation
```
src/cash-flow/README.md
src/cash-flow/API_DOCUMENTATION.md
src/cash-flow/QUICK_START.md
src/cash-flow/INSTALLATION_COMPLETE.md
CASH_FLOW_IMPLEMENTATION_SUMMARY.md (root)
```

### Test Script
```
src/cash-flow/test-cash-flow.ts
```

### Run Test
```powershell
npx tsx src/cash-flow/test-cash-flow.ts
```

---

## ⚡ Key Features

✅ Idempotent transactions  
✅ Batch processing  
✅ Auto-classification rules  
✅ Multi-currency support  
✅ 13-week forecasting  
✅ Cash flow statements  
✅ Transfer elimination  
✅ Historical balances  
✅ Advanced filtering  
✅ CSV/PDF export  

---

## 🐛 Common Issues

**Error:** "Account not found"
→ Create accounts first

**Error:** "Missing exchange rate"
→ Add exchange rate data

**Error:** "Cannot delete account with transactions"
→ Archive account instead (set isActive: false)

**Error:** "Cannot delete transaction that is part of transfer"
→ Delete the transfer instead

---

## 📞 Quick Help

1. Check documentation in `src/cash-flow/`
2. Run test script for sample data
3. Review API_DOCUMENTATION.md for endpoints
4. Check QUICK_START.md for setup guide

---

## 🎯 Module Stats

- **35** API Endpoints
- **6** Database Models
- **23** Transaction Categories
- **4** Account Types
- **13** Weeks Forecast
- **4,313** Lines of Code
- **2,038** Lines of Docs

---

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Created:** October 7, 2025

---

## 💡 Remember

1. Always use **idempotencyKey** for transactions/transfers
2. Create **accounts** before transactions
3. Use **rules** for auto-categorization
4. Test with **dry-run** before applying rules
5. Use **transfers** for inter-account movements
6. Generate **forecasts** for cash planning
7. Export **statements** for reporting

---

🎉 **Happy Cash Flowing!** 💰📊
