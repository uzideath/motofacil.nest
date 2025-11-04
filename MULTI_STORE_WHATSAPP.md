# Multi-Store WhatsApp Integration

## Overview
Each store can now have its own independent Evolution API instance for WhatsApp messaging. This allows different stores to use different WhatsApp numbers and configurations.

## Database Schema
The `Store` model now includes the following WhatsApp-related fields:

```prisma
model Store {
  // ... other fields
  whatsappEnabled     Boolean @default(false)
  whatsappApiUrl      String?
  whatsappInstanceId  String?
  whatsappApiKey      String?
}
```

## API Endpoints

### Store WhatsApp Configuration

#### Get WhatsApp Configuration
```http
GET /stores/:id/whatsapp-config
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "whatsappEnabled": true,
  "whatsappApiUrl": "https://evolution-api.example.com",
  "whatsappInstanceId": "store-123",
  "hasApiKey": true,
  "isConfigured": true
}
```

#### Update WhatsApp Configuration
```http
PATCH /stores/:id/whatsapp-config
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "whatsappEnabled": true,
  "whatsappApiUrl": "https://evolution-api.example.com",
  "whatsappInstanceId": "store-123",
  "whatsappApiKey": "your-api-key-here"
}
```

**Note:** All fields (apiUrl, instanceId, apiKey) are required when enabling WhatsApp for a store.

### WhatsApp Messaging

All WhatsApp endpoints now require a `storeId`:

#### Check Status
```http
GET /whatsapp/status?storeId=<store-id>
Authorization: Bearer <token>
```

- **ADMIN**: Can check status for any store by providing storeId
- **EMPLOYEE**: Automatically uses their assigned store (storeId extracted from JWT)

#### Send Message
```http
POST /whatsapp/send-message
Authorization: Bearer <token>
Content-Type: application/json

{
  "storeId": "store-123",  // Optional for EMPLOYEE (uses their store)
  "number": "+1234567890",
  "text": "Your message here"
}
```

#### Send Attachment
```http
POST /whatsapp/send-attachment
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "storeId": "store-123",  // Optional for EMPLOYEE
  "number": "+1234567890",
  "file": <binary-file>,
  "caption": "Optional caption"
}
```

#### Send Receipt via WhatsApp
```http
POST /receipt/whatsapp
Authorization: Bearer <token>
Content-Type: application/json

{
  "storeId": "store-123",  // Required
  "phoneNumber": "+1234567890",
  "name": "Customer Name",
  "identification": "ID123",
  "concept": "Monthly Payment",
  "amount": 1000,
  "gps": 50,
  "total": 1050,
  "date": "2025-01-15",
  "paymentDate": "2025-01-15",
  "receiptNumber": "REC-001",
  "caption": "Optional custom caption"
}
```

## Security & Access Control

### ADMIN Users
- Can configure WhatsApp for any store
- Can send messages from any store (must provide storeId)
- Can check status for any store

### EMPLOYEE Users
- Cannot configure WhatsApp settings
- Can only send messages from their assigned store (storeId from JWT)
- Automatically uses their store's WhatsApp configuration
- Cannot access other stores' WhatsApp features

## Service Architecture

### WhatsappService
The service now:
- **No longer uses global configuration** from environment variables
- Fetches store-specific configuration from database for each request
- Validates store exists and WhatsApp is enabled
- Ensures all required fields are configured before sending

**Key Method:**
```typescript
private async getStoreConfig(storeId: string): Promise<{
  apiUrl: string;
  instanceId: string;
  apiKey: string;
}> {
  // Validates store, checks if WhatsApp enabled, returns config
}
```

### Updated Method Signatures
All messaging methods now require `storeId` as the first parameter:

```typescript
async sendMessage(storeId: string, dto: SendMessageDto)
async sendAttachment(storeId: string, phoneNumber: string, filePath: string, caption?: string)
async sendRemoteAttachment(storeId: string, phoneNumber: string, urlOrFile: string, ...)
async sendMediaBase64(storeId: string, dto: SendBase64MediaDto)
async getStatus(storeId: string)
```

## Migration from Global to Multi-Store

### What Changed
1. **Environment Variables**: `EVOLUTION_API_URL`, `EVOLUTION_API_INSTANCE`, and `EVOLUTION_API_KEY` are no longer used
2. **Database**: WhatsApp configuration now stored per store in `stores` table
3. **API**: All WhatsApp endpoints require storeId (explicit or from JWT)
4. **Receipt Service**: Now requires storeId when sending receipts

### Migration Steps
1. Run the migration: `npx prisma migrate dev`
2. Configure WhatsApp for each store via API
3. Update frontend to pass storeId when calling WhatsApp endpoints
4. Test messaging with each store's configuration

## Error Handling

### Common Errors

**Store Not Found:**
```json
{
  "statusCode": 404,
  "message": "Store with ID xxx not found"
}
```

**WhatsApp Not Enabled:**
```json
{
  "statusCode": 400,
  "message": "WhatsApp is not enabled for this store"
}
```

**Incomplete Configuration:**
```json
{
  "statusCode": 400,
  "message": "WhatsApp configuration incomplete for this store"
}
```

**Unauthorized Access:**
```json
{
  "statusCode": 403,
  "message": "Unauthorized: Cannot send messages from another store"
}
```

## Testing

### Setup Test Data
```typescript
// Configure WhatsApp for a store
await fetch('http://localhost:3000/stores/store-123/whatsapp-config', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer <admin-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    whatsappEnabled: true,
    whatsappApiUrl: 'https://evolution-api.example.com',
    whatsappInstanceId: 'store-123-instance',
    whatsappApiKey: 'your-api-key'
  })
});
```

### Test Messaging
```typescript
// As EMPLOYEE (storeId from JWT)
await fetch('http://localhost:3000/whatsapp/send-message', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <employee-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    number: '+1234567890',
    text: 'Test message from my store'
  })
});

// As ADMIN (explicit storeId)
await fetch('http://localhost:3000/whatsapp/send-message', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <admin-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    storeId: 'store-123',
    number: '+1234567890',
    text: 'Test message from specific store'
  })
});
```

## Frontend Integration

### Getting Store's WhatsApp Status
```typescript
// For EMPLOYEE
const status = await api.get('/whatsapp/status'); // Uses JWT storeId

// For ADMIN
const status = await api.get(`/whatsapp/status?storeId=${storeId}`);
```

### Sending Messages
```typescript
// Service method should be updated to:
async sendWhatsAppMessage(storeId: string, number: string, text: string) {
  return api.post('/whatsapp/send-message', {
    storeId, // Optional if user is EMPLOYEE
    number,
    text
  });
}
```

### Managing Store Configuration (Admin Only)
```typescript
// Get config
const config = await api.get(`/stores/${storeId}/whatsapp-config`);

// Update config
await api.patch(`/stores/${storeId}/whatsapp-config`, {
  whatsappEnabled: true,
  whatsappApiUrl: 'https://your-api.com',
  whatsappInstanceId: 'instance-123',
  whatsappApiKey: 'your-key'
});
```

## Benefits

1. **Store Independence**: Each store operates with its own WhatsApp number
2. **Scalability**: Easy to add new stores without affecting existing ones
3. **Security**: Employees can only access their store's WhatsApp
4. **Flexibility**: Different stores can use different Evolution API instances
5. **Maintenance**: Can disable/enable WhatsApp per store independently

## Future Enhancements

- [ ] Store WhatsApp configuration UI in frontend
- [ ] WhatsApp message history per store
- [ ] Template messages per store
- [ ] Webhook support for incoming messages per store
- [ ] WhatsApp status monitoring dashboard
