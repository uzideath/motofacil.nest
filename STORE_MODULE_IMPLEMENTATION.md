# Store Module Implementation

## Overview
Complete backend implementation of the Store Management system for multi-store architecture.

## Created Files

### DTOs (`src/store/dto/`)
1. **create-store.dto.ts** - Validation for creating new stores
   - Required fields: `name`, `code`, `address`
   - Optional fields: `city`, `state`, `country`, `phone`, `email`
   - Unique code validation with regex pattern `^[A-Z]{3,4}-\d{2}$`

2. **update-store.dto.ts** - Partial update DTO extending CreateStoreDto
   - All fields optional
   - Includes additional `status` field (ACTIVE, INACTIVE, ARCHIVED)

3. **store-summary.dto.ts** - Analytics response structure
   - Store identification (id, name, code)
   - Statistics: totalVehicles, activeLoans, totalRevenue, pendingPayments

4. **transfer.dto.ts** - DTOs for transfer operations
   - `TransferVehicleDto`: targetStoreId, reason
   - `TransferLoanDto`: targetStoreId, reason
   - `ReassignEmployeeDto`: newStoreId, reason

5. **index.ts** - Barrel export for all DTOs

### Service (`src/store/store.service.ts`)
Comprehensive service with the following operations:

#### CRUD Operations
- `findAll()` - Get all stores (active only)
- `findOne(id)` - Get store by ID with validation
- `create(dto)` - Create new store with unique code validation
- `update(id, dto)` - Update store (validates active status)
- `remove(id)` - Soft delete (sets archived status)

#### Analytics
- `getStoreSummary(id)` - Calculate store statistics
  - Vehicle count
  - Active loan count
  - Total revenue from installments
  - Pending payments (loans with remaining installments)

#### Transfer Operations
- `transferVehicle(vehicleId, targetStoreId, reason, adminId)`
  - Validates no active loans on vehicle
  - Validates target store is active
  - Includes audit logging placeholder

- `transferLoan(loanId, targetStoreId, reason, adminId)`
  - Complex transaction transferring:
    - Loan itself
    - Associated vehicle
    - Owner/User (creates or uses existing)
    - All installments
    - All receipts
  - Validates target store status

- `reassignEmployee(employeeId, newStoreId, reason, adminId)`
  - Validates employee role (not ADMIN)
  - Updates storeId, storeName, storeCode
  - Clears refresh token (forces re-login)
  - Includes audit logging placeholder

### Controller (`src/store/store.controller.ts`)
REST API endpoints with role-based guards:

#### Security
- All endpoints protected by `@UseGuards(JwtAuthGuard, RolesGuard)`
- All endpoints require `@Roles(UserRole.ADMIN)`

#### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stores` | List all stores |
| GET | `/stores/:id` | Get store details |
| GET | `/stores/:id/summary` | Get store analytics |
| POST | `/stores` | Create new store |
| PATCH | `/stores/:id` | Update store |
| DELETE | `/stores/:id` | Delete store (soft) |
| POST | `/stores/transfer/vehicle/:vehicleId` | Transfer vehicle |
| POST | `/stores/transfer/loan/:loanId` | Transfer loan |
| POST | `/stores/transfer/employee/:employeeId` | Reassign employee |

### Module (`src/store/store.module.ts`)
- Imports PrismaModule
- Exports StoreService for use in other modules
- Registered in AppModule

## Integration

### App Module
Updated `src/app.module.ts` to include StoreModule in imports.

### Database Schema
Works with existing Prisma schema:
- Store model with status enum (ACTIVE, INACTIVE, ARCHIVED)
- All entities have `storeId` foreign key
- UserRole enum (ADMIN, EMPLOYEE)

## TODO Items

1. **Authentication Context**
   - Update transfer endpoints to get `adminId` from JWT user context
   - Replace `'ADMIN_USER'` placeholders with actual user ID

2. **Audit Logging**
   - Implement proper audit trail for all transfer operations
   - Log: action, timestamp, admin user, affected entities, reason

3. **Frontend Integration**
   - Update frontend StoreService to match new endpoint paths
   - Add transfer operations to admin UI
   - Test all endpoints with actual API calls

4. **JWT Token Enhancement**
   - Ensure auth service includes in JWT payload:
     - `role` (UserRole.ADMIN or UserRole.EMPLOYEE)
     - `storeId` (null for ADMIN, required for EMPLOYEE)
     - `storeName`
     - `storeCode`

5. **Testing**
   - Unit tests for StoreService
   - E2E tests for all endpoints
   - Test transfer validations and transactions
   - Test role-based access control

## API Usage Examples

### Create Store
```bash
POST /stores
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Medellín Central",
  "code": "MED-01",
  "address": "Calle 10 #50-20",
  "city": "Medellín",
  "country": "Colombia",
  "phone": "+57 300 123 4567",
  "email": "medellin@motoapp.com"
}
```

### Get Store Summary
```bash
GET /stores/{storeId}/summary
Authorization: Bearer <admin_token>
```

### Transfer Vehicle
```bash
POST /stores/transfer/vehicle/{vehicleId}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "targetStoreId": "uuid-of-target-store",
  "reason": "Relocating inventory to Medellín branch"
}
```

### Transfer Loan
```bash
POST /stores/transfer/loan/{loanId}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "targetStoreId": "uuid-of-target-store",
  "reason": "Customer moved to different city"
}
```

### Reassign Employee
```bash
POST /stores/transfer/employee/{employeeId}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "newStoreId": "uuid-of-new-store",
  "reason": "Permanent transfer to Medellín branch"
}
```

## Business Rules Implemented

1. **Store Creation**
   - Unique store codes (format: ABC-01)
   - All required fields validated

2. **Store Updates**
   - Only active stores can be updated
   - Cannot update to ARCHIVED status (use DELETE)

3. **Store Deletion**
   - Soft delete (sets archived)
   - Validates store exists

4. **Vehicle Transfer**
   - Cannot transfer vehicles with active loans
   - Target store must be active

5. **Loan Transfer**
   - Transfers entire loan context (vehicle, owner, installments, receipts)
   - Creates or reuses owner in target store
   - Atomic transaction (all or nothing)

6. **Employee Reassignment**
   - Cannot reassign ADMIN users
   - Target store must be active
   - Forces re-login by clearing refresh token
   - Updates user's store metadata

## Notes

- All transfer operations require ADMIN role
- Pending payments calculated using `remainingInstallments` field on loans
- All operations include validation and proper error handling
- Transaction support ensures data consistency for complex operations
