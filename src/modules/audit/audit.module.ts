import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditRepository } from './audit.repository';

// PATRÓN: Observer — AuditService se suscribe a los eventos de dominio y
// persiste cada acción sensible. PATRÓN: Repository — AuditRepository encapsula
// Prisma para la tabla audit_log (RF37, RNF12).

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
  exports: [AuditService, AuditRepository],
})
export class AuditModule {}
