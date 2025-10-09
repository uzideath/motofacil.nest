# Reports Provider Filter Fix - Empty Results Issue

## Problem
When selecting a specific provider in reports, the system was returning empty data sets instead of filtered results.

## Root Cause
The issue was in how Prisma WHERE conditions were being built. When both provider filtering and search filtering were applied:

### ❌ **Previous (Broken) Approach:**
```typescript
const where: any = {};

// Provider filtering
if (filters.provider) {
  where.vehicle = {
    providerId: filters.provider,
  };
}

// Search filtering
if (filters.search) {
  where.OR = [
    { user: { name: { contains: filters.search } } },
    { vehicle: { plate: { contains: filters.search } } },
  ];
}
```

**Problem**: Setting `where.vehicle` directly and then adding `where.OR` with another vehicle condition creates conflicting constraints. Prisma can't resolve both simultaneously, resulting in no matches.

## Solution

Use Prisma's `AND` operator to properly combine multiple conditions:

### ✅ **New (Fixed) Approach:**

```typescript
const where: any = {
  // Base filters (status, dates, etc.)
};

const andConditions: any[] = [];

// Provider filtering
if (filters.provider && filters.provider !== 'all') {
  andConditions.push({
    vehicle: {
      providerId: filters.provider,
    }
  });
}

// Search filtering
if (filters.search) {
  andConditions.push({
    OR: [
      { user: { name: { contains: filters.search, mode: 'insensitive' } } },
      { vehicle: { plate: { contains: filters.search, mode: 'insensitive' } } },
    ]
  });
}

// Apply AND conditions if any exist
if (andConditions.length > 0) {
  where.AND = andConditions;
}
```

## What Changed

### 1. **Loan Reports** (`getLoanReport`)
- ✅ Uses `AND` operator to combine provider and search filters
- ✅ Both filters can now work together or independently
- ✅ Properly handles relation filtering through vehicle

### 2. **Missing Installments Report** (`getMissingInstallmentsReport`)
- ✅ Uses `AND` operator to combine provider and search filters
- ✅ Works correctly with base filters (status, archived)
- ✅ Properly handles relation filtering through vehicle

### 3. **Vehicle Report** (`getVehicleReport`)
- ✅ Provider filter is direct (not a relation) so can coexist with OR search
- ✅ Added clarifying comments
- ✅ Works correctly as providerId is a direct field on Vehicle table

## How Prisma Interprets the Queries

### With Provider Filter Only:
```sql
SELECT * FROM Loan 
WHERE vehicle.providerId = 'provider-uuid'
```

### With Provider + Search Filters:
```sql
SELECT * FROM Loan 
WHERE 
  vehicle.providerId = 'provider-uuid'
  AND (
    user.name ILIKE '%search%' 
    OR vehicle.plate ILIKE '%search%'
  )
```

## Testing Scenarios

✅ **Scenario 1**: Filter by provider only
- Result: Shows all loans/records for that provider

✅ **Scenario 2**: Filter by search only
- Result: Shows all loans/records matching search term

✅ **Scenario 3**: Filter by provider + search
- Result: Shows loans/records for that provider matching search term

✅ **Scenario 4**: No filters
- Result: Shows all records

✅ **Scenario 5**: Filter by provider + date range
- Result: Shows filtered records for that provider in date range

## API Examples

### Test Provider Filter
```bash
GET /api/v1/reports/loans?provider=550e8400-e29b-41d4-a716-446655440000
```

### Test Provider + Search
```bash
GET /api/v1/reports/missing-installments?provider=550e8400-e29b-41d4-a716-446655440000&search=Honda
```

### Test Provider + Date Range
```bash
GET /api/v1/reports/vehicles?provider=550e8400-e29b-41d4-a716-446655440000&startDate=2025-01-01&endDate=2025-12-31
```

## Key Takeaways

1. **Never overwrite WHERE clauses** - Always combine conditions properly
2. **Use AND for multiple conditions** - Especially when filtering on relations
3. **Use OR for alternative conditions** - Like search across multiple fields
4. **Build conditions array** - Add to array then apply with `where.AND`
5. **Direct fields vs Relations** - Handle differently (Vehicle.providerId vs Loan.vehicle.providerId)

## Prisma Query Structure

```typescript
// ✅ CORRECT - Using AND to combine conditions
{
  where: {
    status: 'ACTIVE',
    AND: [
      { vehicle: { providerId: 'uuid' } },
      { OR: [
        { user: { name: { contains: 'search' } } },
        { vehicle: { plate: { contains: 'search' } } }
      ]}
    ]
  }
}

// ❌ WRONG - Overwriting conditions
{
  where: {
    vehicle: { providerId: 'uuid' },  // Gets overwritten
    OR: [
      { vehicle: { plate: { contains: 'search' } } }  // Conflicts!
    ]
  }
}
```

## Impact

- **Before**: Provider filtering returned empty results
- **After**: Provider filtering returns correct filtered data
- **Backward Compatible**: All existing queries continue to work
- **Combined Filters**: Provider + Search + Date filters now work together

## Files Modified

1. `src/reports/reports.service.ts`
   - `getLoanReport()` - Fixed provider + search combination
   - `getMissingInstallmentsReport()` - Fixed provider + search combination  
   - `getVehicleReport()` - Added clarifying comments (already working correctly)

## Migration Notes

- No database changes required
- No breaking changes to API
- Existing report calls will work better with proper filtering
- Frontend doesn't need any changes
