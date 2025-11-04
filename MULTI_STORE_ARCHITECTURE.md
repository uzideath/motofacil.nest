# Multi-Store Architecture Design

## Executive Summary

This document outlines a comprehensive multi-store system where each store operates independently with complete data segregation. The system supports two roles: **ADMIN** (company owner with global access) and **EMPLOYEE** (store-level access only).

---

## 1. Data Model

### 1.1 New Store Entity

```prisma
model Store {
  id          String   @id @default(uuid())
  name        String   @unique
  code        String   @unique // Short code for the store (e.g., "BOG-01", "MED-02")
  address     String
  city        String
  phone       String?
  status      StoreStatus @default(ACTIVE)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations - All core entities belong to a store
  owners       Owner[]
  providers    Provider[]
  vehicles     Vehicle[]
  loans        Loan[]
  users        User[]        // Clients are also per-store
  installments Installment[]
  cashRegisters CashRegister[]
  expenses     Expense[]
  closings     Closing[]
}

enum StoreStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}
```

### 1.2 Modified Owner (Employee/Admin) Entity

```prisma
model Owner {
  id           String    @id @default(uuid())
  name         String
  username     String    @unique
  email        String?   @unique
  passwordHash String
  role         UserRole  @default(EMPLOYEE)
  
  // Store association - NULL for ADMIN, REQUIRED for EMPLOYEE
  store        Store?    @relation(fields: [storeId], references: [id])
  storeId      String?   
  
  permissions  Json?     // Fine-grained permissions (optional)
  status       String    @default("ACTIVE")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  lastAccess   DateTime?
  refreshToken String?

  // Relations
  expenses      Expense[]
  installments  Installment[]
  cashRegisters CashRegister[]
  auditLogs     AuditLog[]
  
  @@index([storeId])
}

enum UserRole {
  ADMIN      // Global access, no store restriction
  EMPLOYEE   // Restricted to assigned store
}
```

### 1.3 Store-Tagged Entities

All core entities get a `storeId` field:

```prisma
model Provider {
  id        String   @id @default(uuid())
  name      String
  store     Store    @relation(fields: [storeId], references: [id])
  storeId   String
  // ... other fields
  
  @@unique([name, storeId]) // Provider name unique per store
  @@index([storeId])
}

model Vehicle {
  id          String   @id @default(uuid())
  store       Store    @relation(fields: [storeId], references: [id])
  storeId     String
  provider    Provider @relation(fields: [providerId], references: [id])
  providerId  String
  // ... other fields
  
  @@index([storeId])
  @@index([storeId, status])
}

model User { // Clients
  id             String   @id @default(uuid())
  store          Store    @relation(fields: [storeId], references: [id])
  storeId        String
  identification String
  // ... other fields
  
  @@unique([identification, storeId]) // ID unique per store
  @@index([storeId])
}

model Loan {
  id         String   @id @default(uuid())
  store      Store    @relation(fields: [storeId], references: [id])
  storeId    String
  user       User     @relation(fields: [userId], references: [id])
  userId     String
  vehicle    Vehicle  @relation(fields: [vehicleId], references: [id])
  vehicleId  String
  // ... other fields
  
  @@index([storeId])
  @@index([storeId, status])
  @@index([storeId, archived])
}

model Installment {
  id         String   @id @default(uuid())
  store      Store    @relation(fields: [storeId], references: [id])
  storeId    String
  loan       Loan     @relation(fields: [loanId], references: [id])
  loanId     String
  // ... other fields
  
  @@index([storeId])
  @@index([storeId, paymentDate])
}

model CashRegister {
  id         String   @id @default(uuid())
  store      Store    @relation(fields: [storeId], references: [id])
  storeId    String
  provider   Provider @relation(fields: [providerId], references: [id])
  providerId String
  // ... other fields
  
  @@index([storeId])
  @@index([storeId, date])
}

model Expense {
  id         String   @id @default(uuid())
  store      Store    @relation(fields: [storeId], references: [id])
  storeId    String
  // ... other fields
  
  @@index([storeId])
}

model Closing {
  id         String   @id @default(uuid())
  store      Store    @relation(fields: [storeId], references: [id])
  storeId    String
  // ... other fields
  
  @@index([storeId])
}
```

### 1.4 Audit Log for Sensitive Actions

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  store       Store?   @relation(fields: [storeId], references: [id])
  storeId     String?  // NULL for global admin actions
  
  actor       Owner    @relation(fields: [actorId], references: [id])
  actorId     String
  actorRole   UserRole
  
  action      AuditAction
  entity      String   // e.g., "Vehicle", "Loan", "User"
  entityId    String
  
  oldValues   Json?    // Previous state
  newValues   Json?    // New state
  metadata    Json?    // Additional context
  
  ipAddress   String?
  userAgent   String?
  
  createdAt   DateTime @default(now())
  
  @@index([storeId])
  @@index([actorId])
  @@index([createdAt])
  @@index([action])
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  TRANSFER      // Cross-store transfer
  REASSIGN      // Employee reassignment
  LOGIN
  LOGOUT
  EXPORT
  VIEW_SENSITIVE
}
```

---

## 2. Role & Permission Matrix

| Resource | ADMIN | EMPLOYEE (Own Store) | EMPLOYEE (Other Store) |
|----------|-------|---------------------|----------------------|
| **Stores** |
| View all stores | ✅ | ❌ | ❌ |
| Create store | ✅ | ❌ | ❌ |
| Update store | ✅ | ❌ | ❌ |
| Delete store | ✅ | ❌ | ❌ |
| **Employees** |
| View all employees | ✅ | ❌ | ❌ |
| View store employees | ✅ | ✅ | ❌ |
| Create employee | ✅ | ❌ | ❌ |
| Update employee | ✅ | ❌ (self only) | ❌ |
| Reassign employee | ✅ | ❌ | ❌ |
| Delete employee | ✅ | ❌ | ❌ |
| **Vehicles** |
| View vehicles | ✅ (all stores) | ✅ (own store) | ❌ |
| Create vehicle | ✅ | ✅ | ❌ |
| Update vehicle | ✅ | ✅ | ❌ |
| Transfer vehicle | ✅ | ❌ | ❌ |
| Delete vehicle | ✅ | ✅ | ❌ |
| **Loans** |
| View loans | ✅ (all stores) | ✅ (own store) | ❌ |
| Create loan | ✅ | ✅ | ❌ |
| Update loan | ✅ | ✅ | ❌ |
| Archive loan | ✅ | ✅ | ❌ |
| Transfer loan | ✅ | ❌ | ❌ |
| **Installments/Payments** |
| View payments | ✅ (all stores) | ✅ (own store) | ❌ |
| Record payment | ✅ | ✅ | ❌ |
| Update payment | ✅ | ✅ | ❌ |
| Delete payment | ✅ | ❌ | ❌ |
| **Clients (Users)** |
| View clients | ✅ (all stores) | ✅ (own store) | ❌ |
| Create client | ✅ | ✅ | ❌ |
| Update client | ✅ | ✅ | ❌ |
| Transfer client | ✅ | ❌ | ❌ |
| **Providers** |
| View providers | ✅ (all stores) | ✅ (own store) | ❌ |
| Create provider | ✅ | ✅ | ❌ |
| Update provider | ✅ | ✅ | ❌ |
| **Reports** |
| View store reports | ✅ | ✅ (own store) | ❌ |
| Cross-store reports | ✅ | ❌ | ❌ |
| Export reports | ✅ | ✅ (own store) | ❌ |
| **Cash Register** |
| View cash register | ✅ (all stores) | ✅ (own store) | ❌ |
| Create closing | ✅ | ✅ | ❌ |
| Update closing | ✅ | ✅ (same day) | ❌ |
| **Audit Logs** |
| View logs | ✅ (all) | ✅ (own actions) | ❌ |

---

## 3. Authentication & Authorization Flow

### 3.1 Login Flow

```typescript
// 1. User submits credentials
POST /api/v1/auth/login
{
  "username": "employee1",
  "password": "password123"
}

// 2. Backend validates credentials
// 3. Generate JWT with payload:
{
  "sub": "user-uuid",
  "username": "employee1",
  "role": "EMPLOYEE",
  "storeId": "store-uuid-123",  // NULL for ADMIN
  "storeName": "Bogotá Store 01", // For display
  "permissions": { ... },
  "iat": 1699123456,
  "exp": 1699209856
}

// 4. Return tokens
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "refresh-token",
  "user": {
    "id": "user-uuid",
    "name": "Employee Name",
    "role": "EMPLOYEE",
    "storeId": "store-uuid-123",
    "storeName": "Bogotá Store 01"
  }
}
```

### 3.2 Authorization Guards

```typescript
// guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>(
      'roles',
      context.getHandler()
    );
    
    if (!requiredRoles) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    return requiredRoles.some((role) => user.role === role);
  }
}

// guards/store-access.guard.ts
@Injectable()
export class StoreAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceStoreId = request.params.storeId || request.body.storeId;
    
    // Admin can access any store
    if (user.role === UserRole.ADMIN) {
      return true;
    }
    
    // Employee can only access their own store
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.storeId) {
        throw new ForbiddenException('Employee must be assigned to a store');
      }
      
      if (resourceStoreId && resourceStoreId !== user.storeId) {
        throw new ForbiddenException('Access denied to this store');
      }
      
      return true;
    }
    
    return false;
  }
}
```

### 3.3 Decorator for Easy Authorization

```typescript
// decorators/roles.decorator.ts
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

// decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);

// Usage in controllers:
@Get('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard, StoreAccessGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
async getVehicles(@CurrentUser() user: JwtPayload) {
  return this.vehicleService.findAll(user);
}
```

---

## 4. Service Layer with Store Scoping

### 4.1 Base Service with Auto-Scoping

```typescript
// services/base-store.service.ts
export abstract class BaseStoreService<T> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string
  ) {}
  
  protected applyStoreFilter(user: JwtPayload, where: any = {}) {
    // Admin: no filter unless explicitly scoped
    if (user.role === UserRole.ADMIN) {
      return where;
    }
    
    // Employee: always filter by their store
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.storeId) {
        throw new ForbiddenException('Employee must be assigned to a store');
      }
      return { ...where, storeId: user.storeId };
    }
    
    throw new UnauthorizedException('Invalid role');
  }
  
  protected validateStoreAccess(user: JwtPayload, storeId: string) {
    if (user.role === UserRole.ADMIN) {
      return true;
    }
    
    if (user.role === UserRole.EMPLOYEE && user.storeId !== storeId) {
      throw new ForbiddenException(
        'Access denied: Resource belongs to another store'
      );
    }
    
    return true;
  }
}
```

### 4.2 Example: Vehicle Service with Store Scoping

```typescript
// services/vehicle.service.ts
@Injectable()
export class VehicleService extends BaseStoreService<Vehicle> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly auditService: AuditLogService
  ) {
    super(prisma, 'vehicle');
  }
  
  async findAll(user: JwtPayload, filters: VehicleFilters = {}) {
    const where = this.applyStoreFilter(user, {
      ...filters,
      // Additional filters
    });
    
    return this.prisma.vehicle.findMany({
      where,
      include: {
        store: { select: { id: true, name: true, code: true } },
        provider: true,
        loans: {
          where: { archived: false },
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }
  
  async findOne(user: JwtPayload, id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: { store: true }
    });
    
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    
    this.validateStoreAccess(user, vehicle.storeId);
    
    return vehicle;
  }
  
  async create(user: JwtPayload, createDto: CreateVehicleDto) {
    // Determine storeId
    let storeId: string;
    
    if (user.role === UserRole.ADMIN) {
      // Admin must specify store
      if (!createDto.storeId) {
        throw new BadRequestException('Admin must specify storeId');
      }
      storeId = createDto.storeId;
    } else {
      // Employee uses their store
      storeId = user.storeId;
    }
    
    const vehicle = await this.prisma.vehicle.create({
      data: {
        ...createDto,
        storeId,
      },
      include: { store: true }
    });
    
    // Audit log
    await this.auditService.log({
      actorId: user.sub,
      actorRole: user.role,
      storeId,
      action: AuditAction.CREATE,
      entity: 'Vehicle',
      entityId: vehicle.id,
      newValues: vehicle
    });
    
    return vehicle;
  }
  
  async update(user: JwtPayload, id: string, updateDto: UpdateVehicleDto) {
    const vehicle = await this.findOne(user, id); // Validates access
    
    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: updateDto,
      include: { store: true }
    });
    
    // Audit log
    await this.auditService.log({
      actorId: user.sub,
      actorRole: user.role,
      storeId: vehicle.storeId,
      action: AuditAction.UPDATE,
      entity: 'Vehicle',
      entityId: id,
      oldValues: vehicle,
      newValues: updated
    });
    
    return updated;
  }
  
  // ADMIN ONLY: Transfer vehicle to another store
  @Roles(UserRole.ADMIN)
  async transfer(
    user: JwtPayload,
    vehicleId: string,
    targetStoreId: string,
    reason: string
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { loans: { where: { archived: false } } }
    });
    
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    
    if (vehicle.loans.length > 0) {
      throw new BadRequestException(
        'Cannot transfer vehicle with active loans'
      );
    }
    
    const updated = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { storeId: targetStoreId }
    });
    
    // Audit log
    await this.auditService.log({
      actorId: user.sub,
      actorRole: user.role,
      storeId: null, // Global action
      action: AuditAction.TRANSFER,
      entity: 'Vehicle',
      entityId: vehicleId,
      oldValues: { storeId: vehicle.storeId },
      newValues: { storeId: targetStoreId },
      metadata: { reason, fromStore: vehicle.storeId, toStore: targetStoreId }
    });
    
    return updated;
  }
}
```

---

## 5. Example CRUD Endpoints with Store Scoping

### 5.1 Vehicle Controller

```typescript
@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard, StoreAccessGuard)
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}
  
  @Get()
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() filters: VehicleFilters
  ) {
    return this.vehicleService.findAll(user, filters);
  }
  
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string
  ) {
    return this.vehicleService.findOne(user, id);
  }
  
  @Post()
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() createDto: CreateVehicleDto
  ) {
    return this.vehicleService.create(user, createDto);
  }
  
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() updateDto: UpdateVehicleDto
  ) {
    return this.vehicleService.update(user, id, updateDto);
  }
  
  @Post(':id/transfer')
  @Roles(UserRole.ADMIN)
  async transfer(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() transferDto: TransferVehicleDto
  ) {
    return this.vehicleService.transfer(
      user,
      id,
      transferDto.targetStoreId,
      transferDto.reason
    );
  }
}
```

### 5.2 Loan Controller

```typescript
@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard, StoreAccessGuard)
export class LoanController {
  constructor(private readonly loanService: LoanService) {}
  
  @Get()
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() filters: LoanFilters
  ) {
    // Service auto-applies store filter based on user role
    return this.loanService.findAll(user, filters);
  }
  
  @Post()
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() createDto: CreateLoanDto
  ) {
    // Validate vehicle and user belong to same store
    return this.loanService.create(user, createDto);
  }
}
```

### 5.3 Store Management Controller (Admin Only)

```typescript
@Controller('stores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoreController {
  constructor(private readonly storeService: StoreService) {}
  
  @Get()
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.storeService.findAll();
  }
  
  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.storeService.findOne(id);
  }
  
  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() createDto: CreateStoreDto
  ) {
    return this.storeService.create(user, createDto);
  }
  
  @Get(':id/summary')
  @Roles(UserRole.ADMIN)
  async getStoreSummary(@Param('id') id: string) {
    return this.storeService.getSummary(id);
  }
}
```

---

## 6. Edge Cases & Handling

### 6.1 Employee Reassignment to Different Store

```typescript
// services/owner.service.ts
@Roles(UserRole.ADMIN)
async reassignEmployee(
  adminUser: JwtPayload,
  employeeId: string,
  newStoreId: string,
  reason: string
) {
  const employee = await this.prisma.owner.findUnique({
    where: { id: employeeId },
    include: { store: true }
  });
  
  if (!employee) {
    throw new NotFoundException('Employee not found');
  }
  
  if (employee.role === UserRole.ADMIN) {
    throw new BadRequestException('Cannot reassign admin users');
  }
  
  const oldStoreId = employee.storeId;
  
  // Update employee
  const updated = await this.prisma.owner.update({
    where: { id: employeeId },
    data: { storeId: newStoreId }
  });
  
  // Audit log
  await this.auditService.log({
    actorId: adminUser.sub,
    actorRole: UserRole.ADMIN,
    storeId: null, // Global action
    action: AuditAction.REASSIGN,
    entity: 'Owner',
    entityId: employeeId,
    oldValues: { storeId: oldStoreId },
    newValues: { storeId: newStoreId },
    metadata: {
      reason,
      employeeName: employee.name,
      fromStore: employee.store?.name,
      toStoreName: (await this.prisma.store.findUnique({ where: { id: newStoreId } }))?.name
    }
  });
  
  // Invalidate employee's tokens (force re-login)
  await this.prisma.owner.update({
    where: { id: employeeId },
    data: { refreshToken: null }
  });
  
  return updated;
}
```

### 6.2 Vehicle Transfer Between Stores

```typescript
// services/vehicle.service.ts
@Roles(UserRole.ADMIN)
async transferVehicle(
  adminUser: JwtPayload,
  vehicleId: string,
  targetStoreId: string,
  reason: string
) {
  // 1. Validate vehicle exists
  const vehicle = await this.prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      store: true,
      loans: { where: { archived: false } }
    }
  });
  
  if (!vehicle) {
    throw new NotFoundException('Vehicle not found');
  }
  
  // 2. Check for active loans
  if (vehicle.loans.length > 0) {
    throw new BadRequestException(
      'Cannot transfer vehicle with active loans. Archive loans first.'
    );
  }
  
  // 3. Validate target store
  const targetStore = await this.prisma.store.findUnique({
    where: { id: targetStoreId }
  });
  
  if (!targetStore || targetStore.status !== 'ACTIVE') {
    throw new BadRequestException('Invalid or inactive target store');
  }
  
  // 4. Transfer vehicle
  const updated = await this.prisma.vehicle.update({
    where: { id: vehicleId },
    data: { storeId: targetStoreId }
  });
  
  // 5. Audit log
  await this.auditService.log({
    actorId: adminUser.sub,
    actorRole: UserRole.ADMIN,
    storeId: null,
    action: AuditAction.TRANSFER,
    entity: 'Vehicle',
    entityId: vehicleId,
    oldValues: { storeId: vehicle.storeId },
    newValues: { storeId: targetStoreId },
    metadata: {
      reason,
      vehiclePlate: vehicle.plate,
      fromStore: vehicle.store.name,
      toStore: targetStore.name
    }
  });
  
  return updated;
}
```

### 6.3 Loan Transfer Between Stores (Complex Case)

```typescript
// services/loan.service.ts
@Roles(UserRole.ADMIN)
async transferLoan(
  adminUser: JwtPayload,
  loanId: string,
  targetStoreId: string,
  reason: string
) {
  // This is complex because loan, vehicle, and user must all move together
  
  return await this.prisma.$transaction(async (tx) => {
    // 1. Get loan with all relations
    const loan = await tx.loan.findUnique({
      where: { id: loanId },
      include: {
        vehicle: true,
        user: true,
        payments: true,
        store: true
      }
    });
    
    if (!loan) {
      throw new NotFoundException('Loan not found');
    }
    
    // 2. Validate target store
    const targetStore = await tx.store.findUnique({
      where: { id: targetStoreId }
    });
    
    if (!targetStore || targetStore.status !== 'ACTIVE') {
      throw new BadRequestException('Invalid target store');
    }
    
    // 3. Transfer all related entities
    
    // Transfer vehicle
    await tx.vehicle.update({
      where: { id: loan.vehicleId },
      data: { storeId: targetStoreId }
    });
    
    // Transfer or link user (client)
    // Check if user already exists in target store
    const existingUser = await tx.user.findFirst({
      where: {
        storeId: targetStoreId,
        identification: loan.user.identification
      }
    });
    
    let targetUserId: string;
    
    if (existingUser) {
      targetUserId = existingUser.id;
    } else {
      // Transfer user to new store
      await tx.user.update({
        where: { id: loan.userId },
        data: { storeId: targetStoreId }
      });
      targetUserId = loan.userId;
    }
    
    // Transfer loan
    await tx.loan.update({
      where: { id: loanId },
      data: {
        storeId: targetStoreId,
        userId: targetUserId
      }
    });
    
    // Transfer all installments
    await tx.installment.updateMany({
      where: { loanId: loanId },
      data: { storeId: targetStoreId }
    });
    
    // 4. Audit log
    await this.auditService.log({
      actorId: adminUser.sub,
      actorRole: UserRole.ADMIN,
      storeId: null,
      action: AuditAction.TRANSFER,
      entity: 'Loan',
      entityId: loanId,
      oldValues: {
        storeId: loan.storeId,
        vehicleStoreId: loan.vehicle.storeId,
        userStoreId: loan.user.storeId
      },
      newValues: {
        storeId: targetStoreId,
        vehicleStoreId: targetStoreId,
        userStoreId: targetStoreId
      },
      metadata: {
        reason,
        contractNumber: loan.contractNumber,
        fromStore: loan.store.name,
        toStore: targetStore.name,
        installmentsCount: loan.payments.length
      }
    });
    
    return loan;
  });
}
```

### 6.4 Cross-Store Reports (Admin Only)

```typescript
// services/reports.service.ts
@Roles(UserRole.ADMIN)
async getCrossStoreReport(
  adminUser: JwtPayload,
  filters: CrossStoreReportFilters
) {
  // Get summary for each store
  const stores = await this.prisma.store.findMany({
    where: { status: 'ACTIVE' },
    include: {
      _count: {
        select: {
          vehicles: true,
          loans: { where: { archived: false } },
          users: true
        }
      }
    }
  });
  
  const storeReports = await Promise.all(
    stores.map(async (store) => {
      const [
        totalVehicles,
        activeLoans,
        totalRevenue,
        pendingPayments
      ] = await Promise.all([
        this.prisma.vehicle.count({ where: { storeId: store.id } }),
        this.prisma.loan.count({
          where: { storeId: store.id, status: 'ACTIVE', archived: false }
        }),
        this.prisma.installment.aggregate({
          where: { storeId: store.id },
          _sum: { amount: true }
        }),
        this.getMissingInstallmentsCount(store.id)
      ]);
      
      return {
        storeId: store.id,
        storeName: store.name,
        storeCode: store.code,
        totalVehicles,
        activeLoans,
        totalRevenue: totalRevenue._sum.amount || 0,
        pendingPayments
      };
    })
  );
  
  // Audit log
  await this.auditService.log({
    actorId: adminUser.sub,
    actorRole: UserRole.ADMIN,
    storeId: null,
    action: AuditAction.VIEW_SENSITIVE,
    entity: 'CrossStoreReport',
    entityId: 'N/A',
    metadata: {
      reportType: 'cross-store-summary',
      storesIncluded: stores.map(s => s.name)
    }
  });
  
  return {
    summary: storeReports,
    totalStores: stores.length,
    generatedAt: new Date(),
    generatedBy: adminUser.name
  };
}
```

### 6.5 Audit Log Querying

```typescript
// services/audit-log.service.ts
async queryLogs(
  user: JwtPayload,
  filters: AuditLogFilters
): Promise<AuditLog[]> {
  const where: any = {};
  
  // Apply store filter based on role
  if (user.role === UserRole.EMPLOYEE) {
    // Employees can only see logs for their store
    where.storeId = user.storeId;
  } else if (user.role === UserRole.ADMIN) {
    // Admin can filter by store or see all
    if (filters.storeId) {
      where.storeId = filters.storeId;
    }
  }
  
  // Additional filters
  if (filters.action) {
    where.action = filters.action;
  }
  
  if (filters.entity) {
    where.entity = filters.entity;
  }
  
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }
  
  return this.prisma.auditLog.findMany({
    where,
    include: {
      actor: { select: { id: true, name: true, username: true, role: true } },
      store: { select: { id: true, name: true, code: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: filters.limit || 100
  });
}
```

---

## 7. Frontend Considerations

### 7.1 Store Context Provider

```typescript
// contexts/StoreContext.tsx
interface StoreContextType {
  currentStore: Store | null;
  isAdmin: boolean;
  canAccessStore: (storeId: string) => boolean;
  switchStore: (storeId: string) => void; // Admin only
}

export const StoreProvider: React.FC = ({ children }) => {
  const { user } = useAuth();
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  
  useEffect(() => {
    if (user?.storeId) {
      fetchStore(user.storeId).then(setCurrentStore);
    }
  }, [user]);
  
  const canAccessStore = (storeId: string) => {
    if (user?.role === 'ADMIN') return true;
    return user?.storeId === storeId;
  };
  
  const switchStore = (storeId: string) => {
    if (user?.role !== 'ADMIN') {
      throw new Error('Only admins can switch stores');
    }
    // Admin can temporarily scope their view to a specific store
    // This doesn't change their token, just filters the UI
    fetchStore(storeId).then(setCurrentStore);
  };
  
  return (
    <StoreContext.Provider value={{
      currentStore,
      isAdmin: user?.role === 'ADMIN',
      canAccessStore,
      switchStore
    }}>
      {children}
    </StoreContext.Provider>
  );
};
```

### 7.2 Admin Store Switcher Component

```typescript
// components/StoreS witcher.tsx
export const StoreSwitcher: React.FC = () => {
  const { isAdmin, currentStore, switchStore } = useStore();
  const [stores, setStores] = useState<Store[]>([]);
  
  if (!isAdmin) return null;
  
  return (
    <Select value={currentStore?.id} onValueChange={switchStore}>
      <SelectTrigger>
        <SelectValue placeholder="All Stores" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">All Stores (Global View)</SelectItem>
        {stores.map((store) => (
          <SelectItem key={store.id} value={store.id}>
            {store.name} ({store.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

---

## 8. Implementation Checklist

### Phase 1: Database & Core Setup
- [ ] Add `Store` model to Prisma schema
- [ ] Add `storeId` to all core entities (Vehicle, Loan, User, etc.)
- [ ] Add `AuditLog` model
- [ ] Update `Owner` model with `role` and `storeId`
- [ ] Create migration
- [ ] Seed initial stores and admin user

### Phase 2: Authentication & Authorization
- [ ] Update JWT payload to include `role` and `storeId`
- [ ] Create `RolesGuard`
- [ ] Create `StoreAccessGuard`
- [ ] Update login flow to include store information
- [ ] Create role/permission decorators

### Phase 3: Service Layer
- [ ] Create `BaseStoreService` with auto-scoping
- [ ] Update all existing services to extend `BaseStoreService`
- [ ] Add `validateStoreAccess()` to all entity operations
- [ ] Create `AuditLogService`
- [ ] Add audit logging to sensitive operations

### Phase 4: API Endpoints
- [ ] Create `StoreController` (Admin only)
- [ ] Update all controllers with store-aware guards
- [ ] Add transfer endpoints (vehicles, loans, employees)
- [ ] Add cross-store report endpoints (Admin only)
- [ ] Add audit log query endpoints

### Phase 5: Frontend
- [ ] Create `StoreContext` provider
- [ ] Add store information to auth state
- [ ] Create admin store switcher component
- [ ] Update all API calls to respect store context
- [ ] Add "Store" column to relevant tables
- [ ] Create store management UI (Admin)

### Phase 6: Testing
- [ ] Unit tests for store scoping logic
- [ ] Integration tests for each role
- [ ] Test cross-store access attempts (should fail)
- [ ] Test transfer operations
- [ ] Test audit logging

### Phase 7: Documentation & Training
- [ ] Document store architecture
- [ ] Create admin guide for managing stores
- [ ] Create employee onboarding guide
- [ ] Document transfer procedures

---

## 9. Security Best Practices

1. **Never trust client-provided storeId** - Always derive from JWT for employees
2. **Double-check permissions** - Validate at both guard and service level
3. **Log everything sensitive** - Transfers, deletions, cross-store access
4. **Invalidate tokens on reassignment** - Force re-login when employee changes stores
5. **Rate limit transfer operations** - Prevent abuse
6. **Backup before transfers** - Critical data movement should be reversible
7. **Monitor audit logs** - Set up alerts for suspicious patterns
8. **Encrypt audit logs** - Sensitive business data
9. **Regular permission audits** - Review who has access to what
10. **Principle of least privilege** - Default deny, explicit allow

---

## 10. Sample Database Queries

### Employee sees only their store's data:
```sql
-- Automatic WHERE clause for EMPLOYEE role
SELECT * FROM "Vehicle" 
WHERE "storeId" = 'employee-store-id';

SELECT * FROM "Loan" 
WHERE "storeId" = 'employee-store-id' 
  AND "archived" = false;
```

### Admin sees all stores (or filtered):
```sql
-- Admin with no filter - sees everything
SELECT * FROM "Vehicle";

-- Admin with store filter
SELECT * FROM "Vehicle" 
WHERE "storeId" = 'selected-store-id';
```

### Cross-store analytics (Admin only):
```sql
SELECT 
  s."name" as store_name,
  s."code" as store_code,
  COUNT(DISTINCT v."id") as total_vehicles,
  COUNT(DISTINCT l."id") FILTER (WHERE l."status" = 'ACTIVE') as active_loans,
  SUM(i."amount") as total_revenue
FROM "Store" s
LEFT JOIN "Vehicle" v ON v."storeId" = s."id"
LEFT JOIN "Loan" l ON l."storeId" = s."id"
LEFT JOIN "Installment" i ON i."storeId" = s."id"
WHERE s."status" = 'ACTIVE'
GROUP BY s."id", s."name", s."code"
ORDER BY total_revenue DESC;
```

---

This architecture provides complete data segregation while maintaining flexibility for the admin to manage all stores. All access is verified at multiple levels, and sensitive operations are fully audited.
