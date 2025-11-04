# Phase 2 Implementation Guide - Authentication & Authorization

## ✅ Completed Components

### 1. **Updated JWT Payload**
- Changed from `roles: string[]` to `role: UserRole` (single role)
- Added `storeId: string | null` (null for ADMIN, storeId for EMPLOYEE)
- Added optional `storeName` and `storeCode` for display purposes

```typescript
export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  storeId: string | null;
  storeName?: string;
  storeCode?: string;
}
```

### 2. **Updated Auth Service**
- Login now fetches store information for EMPLOYEE users
- Returns store data in login response
- Updated register method to accept `UserRole` and `storeId`
- Updated refresh token to include new payload structure

### 3. **Updated RolesGuard**
- Works with single `UserRole` enum instead of roles array
- Validates user role against required roles
- Better error messages

### 4. **New StoreAccessGuard**
- Ensures ADMIN can access all stores
- Ensures EMPLOYEE can only access their assigned store
- Adds `userStoreId` and `isAdmin` to request object
- Can be skipped with `@SkipStoreCheck()` decorator

### 5. **New Decorators**

#### `@SkipStoreCheck()`
Skip store access validation (for admin-only routes)

#### `@UserStoreId()`
Extract storeId from request (null for ADMIN, storeId for EMPLOYEE)

#### `@IsAdmin()`
Check if current user is an admin

#### `@LogAction(action, entity)`
Mark routes for audit logging

### 6. **BaseStoreService**
Abstract base class for automatic store filtering

**Methods:**
- `storeFilter(userStoreId)` - Returns Prisma where clause
- `validateStoreAccess(entity, userStoreId)` - Validates entity access
- `getStoreIdForCreate(userStoreId, providedStoreId)` - Gets storeId for new entities

### 7. **AuditLogService**
Service for tracking sensitive operations

**Methods:**
- `log(data)` - Create audit log entry
- `findAll(params)` - Get audit logs with filtering
- `getEntityHistory(entity, entityId)` - Get entity audit trail

---

## 📝 How to Use in Controllers

### Example 1: Basic CRUD with Store Filtering

```typescript
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { StoreAccessGuard } from 'src/auth/guards/store-access.guard';
import { UserStoreId, IsAdmin } from 'src/auth/decorators/store.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'generated/prisma';

@Controller('loans')
@UseGuards(JwtAuthGuard, StoreAccessGuard, RolesGuard) // Apply guards
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  // Both ADMIN and EMPLOYEE can access (filtered by store)
  @Get()
  findAll(@UserStoreId() storeId: string | null) {
    return this.loanService.findAll(storeId);
  }

  // Only ADMIN can access this route
  @Get('admin/all-stores')
  @Roles(UserRole.ADMIN)
  findAllStores() {
    return this.loanService.findAllStores();
  }

  // Create loan (EMPLOYEE creates in their store, ADMIN must specify store)
  @Post()
  create(
    @Body() createDto: CreateLoanDto,
    @UserStoreId() storeId: string | null,
    @IsAdmin() isAdmin: boolean,
  ) {
    return this.loanService.create(createDto, storeId, isAdmin);
  }

  // Get single loan (automatically filtered by store)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @UserStoreId() storeId: string | null,
  ) {
    return this.loanService.findOne(id, storeId);
  }
}
```

---

## 📝 How to Use in Services

### Example 1: Service with Store Filtering (Extending BaseStoreService)

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { BaseStoreService } from 'src/lib/base-store.service';

@Injectable()
export class LoanService extends BaseStoreService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // Find all loans (filtered by store)
  async findAll(userStoreId: string | null) {
    return this.prisma.loan.findMany({
      where: this.storeFilter(userStoreId), // Automatic filtering
      include: {
        user: true,
        vehicle: true,
        payments: true,
      },
    });
  }

  // Find one loan with validation
  async findOne(id: string, userStoreId: string | null) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        user: true,
        vehicle: true,
      },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    // Validate access
    this.validateStoreAccess(loan, userStoreId);

    return loan;
  }

  // Create loan
  async create(data: CreateLoanDto, userStoreId: string | null, isAdmin: boolean) {
    // Get correct storeId
    const storeId = this.getStoreIdForCreate(userStoreId, data.storeId);

    return this.prisma.loan.create({
      data: {
        ...data,
        storeId, // Always set storeId
        status: 'ACTIVE',
        archived: false,
      },
      include: {
        user: true,
        vehicle: true,
      },
    });
  }

  // Update loan
  async update(id: string, data: UpdateLoanDto, userStoreId: string | null) {
    // First, validate access
    const loan = await this.findOne(id, userStoreId);

    return this.prisma.loan.update({
      where: { id },
      data,
    });
  }

  // ADMIN ONLY: Get all loans across all stores
  async findAllStores() {
    return this.prisma.loan.findMany({
      include: {
        user: true,
        vehicle: true,
        store: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });
  }
}
```

---

## 📝 How to Add Audit Logging

### Example: Audit Logging in Controller

```typescript
import { Controller, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { StoreAccessGuard } from 'src/auth/guards/store-access.guard';
import { LogAction } from 'src/auth/decorators/log-action.decorator';
import { User } from 'src/auth/decorators/user';
import { AuditAction } from 'generated/prisma';
import { AuditLogService } from 'src/lib/audit-log.service';

@Controller('loans')
@UseGuards(JwtAuthGuard, StoreAccessGuard)
export class LoanController {
  constructor(
    private readonly loanService: LoanService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @LogAction(AuditAction.CREATE, 'Loan')
  async create(
    @Body() createDto: CreateLoanDto,
    @User() user: any,
  ) {
    const loan = await this.loanService.create(createDto, user.storeId);

    // Log the action
    await this.auditLogService.log({
      storeId: loan.storeId,
      actorId: user.sub,
      actorRole: user.role,
      action: AuditAction.CREATE,
      entity: 'Loan',
      entityId: loan.id,
      newValues: { ...createDto },
      metadata: { vehicleId: loan.vehicleId, userId: loan.userId },
    });

    return loan;
  }

  @Put(':id')
  @LogAction(AuditAction.UPDATE, 'Loan')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateLoanDto,
    @User() user: any,
  ) {
    const oldLoan = await this.loanService.findOne(id, user.storeId);
    const updatedLoan = await this.loanService.update(id, updateDto, user.storeId);

    // Log the action
    await this.auditLogService.log({
      storeId: updatedLoan.storeId,
      actorId: user.sub,
      actorRole: user.role,
      action: AuditAction.UPDATE,
      entity: 'Loan',
      entityId: updatedLoan.id,
      oldValues: oldLoan,
      newValues: updateDto,
    });

    return updatedLoan;
  }

  @Delete(':id/archive')
  @LogAction(AuditAction.ARCHIVE, 'Loan')
  async archive(
    @Param('id') id: string,
    @User() user: any,
  ) {
    const loan = await this.loanService.archive(id, user.storeId);

    await this.auditLogService.log({
      storeId: loan.storeId,
      actorId: user.sub,
      actorRole: user.role,
      action: AuditAction.ARCHIVE,
      entity: 'Loan',
      entityId: loan.id,
    });

    return loan;
  }
}
```

---

## 🔐 Guard Combinations

### Common Guard Patterns

```typescript
// Pattern 1: Authenticated users only (any role, store-filtered)
@UseGuards(JwtAuthGuard, StoreAccessGuard)

// Pattern 2: ADMIN only
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)

// Pattern 3: ADMIN or EMPLOYEE (both can access, store-filtered)
@UseGuards(JwtAuthGuard, StoreAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)

// Pattern 4: ADMIN only, no store filtering
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@SkipStoreCheck()
```

---

## 📋 Migration Checklist

### For Each Service:

1. ✅ Extend `BaseStoreService`
2. ✅ Add `userStoreId: string | null` parameter to all methods
3. ✅ Use `this.storeFilter(userStoreId)` in `findMany` queries
4. ✅ Use `this.validateStoreAccess(entity, userStoreId)` after finding entities
5. ✅ Use `this.getStoreIdForCreate(userStoreId, providedStoreId)` when creating
6. ✅ Add separate methods for ADMIN-only operations (e.g., `findAllStores()`)

### For Each Controller:

1. ✅ Add guards: `@UseGuards(JwtAuthGuard, StoreAccessGuard, RolesGuard)`
2. ✅ Add `@UserStoreId()` parameter to routes
3. ✅ Add `@IsAdmin()` parameter where needed
4. ✅ Add `@Roles()` decorator for role-specific routes
5. ✅ Add `@LogAction()` for sensitive operations
6. ✅ Inject and use `AuditLogService` for logging

---

## 🎯 Next Steps

1. Update all existing services to extend `BaseStoreService`
2. Update all controllers to use new guards and decorators
3. Add audit logging to sensitive operations
4. Test with both ADMIN and EMPLOYEE users
5. Verify data isolation between stores
6. Update frontend to handle store information in JWT

---

## 🔍 Testing the Implementation

### Test Scenarios:

1. **ADMIN Login**
   - Should receive `storeId: null` in JWT
   - Should see data from all stores
   - Can create entities in any store

2. **EMPLOYEE Login**
   - Should receive `storeId: "<store-id>"` in JWT
   - Should only see data from their store
   - Can only create entities in their store
   - Cannot access other stores' data

3. **Audit Logging**
   - All CREATE/UPDATE/DELETE operations are logged
   - Logs include actor, action, entity, old/new values
   - Logs are associated with the correct store
