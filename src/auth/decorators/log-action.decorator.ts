import { SetMetadata } from '@nestjs/common';
import { AuditAction } from 'generated/prisma';

export const AUDIT_LOG_KEY = 'auditLog';

export interface AuditLogMetadata {
  action: AuditAction;
  entity: string;
}

/**
 * Decorator to mark routes that should be audit logged
 * Use with AuditLogInterceptor
 * 
 * @example
 * @LogAction(AuditAction.CREATE, 'Loan')
 * @Post()
 * create(@Body() data: CreateLoanDto) { ... }
 */
export const LogAction = (action: AuditAction, entity: string) =>
  SetMetadata(AUDIT_LOG_KEY, { action, entity } as AuditLogMetadata);
