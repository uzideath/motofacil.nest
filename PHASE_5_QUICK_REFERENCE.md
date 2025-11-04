# Phase 5 Quick Reference Guide

## 🎯 What Was Built

Phase 5 implements the **frontend multi-store architecture**, enabling:
- Role-based store access (Admin vs Employee)
- Store switching for administrators
- Store context throughout the application
- Complete store management UI

---

## 📦 New Files Created

```
motofacil.react/
├── contexts/
│   └── StoreContext.tsx          # Store state management & context provider
├── lib/services/
│   └── store.service.ts          # Store API service with all operations
├── components/common/
│   └── StoreSwitcher.tsx         # Store UI components (3 variants)
└── app/admin/stores/
    └── page.tsx                  # Store management admin page (BONUS)
```

---

## 🔧 Modified Files

```
motofacil.react/
├── hooks/
│   └── useAuth.tsx               # Updated User type with store fields
├── lib/types/
│   └── index.ts                  # Added Store type, updated all entities
├── lib/services/
│   └── auth.service.ts           # Updated JWT decoding for store data
├── app/
│   └── layout.tsx                # Integrated StoreProvider
└── components/sidebar/
    └── sidebar.tsx               # Added store display to navigation
```

---

## 🎨 UI Components Usage

### For Admin Users - Store Switcher
```tsx
import { StoreSwitcher } from "@/components/common/StoreSwitcher"

// Full version (in header, toolbar)
<StoreSwitcher />

// Compact version (in mobile nav, tight spaces)
<StoreSwitcherCompact />
```

### For Employee Users - Store Badge
```tsx
import { StoreBadge } from "@/components/common/StoreSwitcher"

// Shows employee's assigned store
<StoreBadge />
```

---

## 🔌 Store Context Hook

```tsx
import { useStore } from "@/contexts/StoreContext"

function MyComponent() {
  const {
    currentStore,      // Currently selected/assigned store
    allStores,         // All stores (admin only)
    isAdmin,           // Is user an admin?
    isEmployee,        // Is user an employee?
    isLoading,         // Loading state
    canAccessStore,    // Check store access
    switchStore,       // Switch store (admin only)
    refreshStores,     // Reload store data
  } = useStore()

  // Use in your component
}
```

---

## 🛡️ Role-Based Access

### Admin Users
- **Role:** `"ADMIN"`
- **Store Access:** All stores
- **Can Switch:** ✅ Yes
- **UI Shows:** StoreSwitcher dropdown
- **JWT:** No storeId (null)

### Employee Users
- **Role:** `"EMPLOYEE"`
- **Store Access:** Assigned store only
- **Can Switch:** ❌ No
- **UI Shows:** StoreBadge
- **JWT:** Contains storeId

---

## 🔄 Store Service API

```tsx
import { StoreService } from "@/lib/services/store.service"

// Get all stores (admin only)
const stores = await StoreService.getAllStores()

// Get single store
const store = await StoreService.getStore(storeId)

// Create store (admin only)
const newStore = await StoreService.createStore({
  name: "New Store",
  code: "NS-01",
  address: "123 Main St",
  city: "City Name",
  phone: "+1234567890",
  status: StoreStatus.ACTIVE
})

// Update store
await StoreService.updateStore(storeId, { name: "Updated Name" })

// Delete store
await StoreService.deleteStore(storeId)

// Get store analytics
const summary = await StoreService.getStoreSummary(storeId)

// Transfer operations (admin only)
await StoreService.transferVehicle(vehicleId, targetStoreId, "Reason")
await StoreService.transferLoan(loanId, targetStoreId, "Reason")
await StoreService.reassignEmployee(employeeId, newStoreId, "Reason")
```

---

## 📊 Type Definitions

```tsx
import { Store, StoreStatus } from "@/lib/types"

// Store entity
type Store = {
  id: string
  name: string
  code: string
  address: string
  city: string
  phone?: string | null
  status: StoreStatus
  createdAt: string
  updatedAt: string
}

// Store status enum
enum StoreStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED"
}

// Updated User type (from useAuth)
type User = {
  id: string
  name: string
  username: string
  roles: Role[]
  role: Role                    // ✨ NEW
  storeId?: string | null       // ✨ NEW
  storeName?: string | null     // ✨ NEW
  storeCode?: string | null     // ✨ NEW
  exp?: number
}

// Updated Role enum
type Role = "ADMIN" | "EMPLOYEE"  // ⚠️ Changed from "USER"
```

---

## 🚦 Common Patterns

### Check if User Can Access Store
```tsx
const { canAccessStore } = useStore()

if (canAccessStore(targetStoreId)) {
  // Proceed with operation
} else {
  // Show access denied
}
```

### Filter Data by Current Store
```tsx
const { currentStore, isAdmin } = useStore()

// Admin: filter by selected store OR show all
const filter = isAdmin && currentStore 
  ? { storeId: currentStore.id }
  : {}

// Employee: always filtered by their store
const data = await fetchData(filter)
```

### React to Store Changes
```tsx
const { currentStore } = useStore()

useEffect(() => {
  // Refetch data when store changes
  loadData()
}, [currentStore])
```

---

## ⚠️ Important Notes

### Breaking Changes
- **Role type changed:** `"USER"` → `"EMPLOYEE"`
- Update all role checks in your codebase
- Update permission guards
- Update route access logic

### Backend Requirements
Phase 5 assumes backend has:
- JWT tokens include `storeId`, `storeName`, `storeCode`
- Store endpoints at `/api/v1/stores/*`
- All data endpoints filter by store based on user role
- Transfer endpoints at `/api/v1/{entity}/{id}/transfer`

### TypeScript Errors
If you see import errors for `store.service.ts`:
1. Restart TypeScript server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
2. File exists at: `lib/services/store.service.ts`
3. This is a cache issue, not a real error

---

## 🧪 Quick Test Commands

### Test Admin Flow
```typescript
// 1. Login as admin
// 2. Check sidebar shows StoreSwitcher
// 3. Click dropdown and select a store
// 4. Verify data updates to show selected store
// 5. Check localStorage has "selectedStoreId"
```

### Test Employee Flow
```typescript
// 1. Login as employee
// 2. Check sidebar shows StoreBadge
// 3. Verify badge shows correct store code/name
// 4. Verify all data is scoped to employee's store
// 5. Verify employee cannot access other stores
```

---

## 📱 Responsive Behavior

- **Desktop:** Full StoreSwitcher with store names
- **Mobile:** Compact version with codes only
- **Collapsed Sidebar:** Hidden (shows on expand)
- **Admin Store Page:** Full table view with CRUD

---

## 🎯 Next Steps

1. **Backend Integration:** Wait for Phase 1-4 backend implementation
2. **Role Migration:** Update all "USER" references to "EMPLOYEE"
3. **Testing:** Complete testing checklist in PHASE_5_CHECKLIST.md
4. **UI Enhancement:** Add store indicators to tables (optional)
5. **Documentation:** Update user guides with multi-store features

---

## 📞 Quick Links

- **Full Summary:** `PHASE_5_IMPLEMENTATION_SUMMARY.md`
- **Checklist:** `PHASE_5_CHECKLIST.md`
- **Architecture:** `MULTI_STORE_ARCHITECTURE.md`
- **Backend Phases:** `PHASE_2_IMPLEMENTATION_GUIDE.md`

---

**Phase 5 Status:** ✅ **COMPLETE**

All frontend components are built and ready for backend integration!
