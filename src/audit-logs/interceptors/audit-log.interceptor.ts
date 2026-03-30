import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from '../audit-logs.service';
import { UserRole } from '../../shared/enums/user-role.enum';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLogInterceptor');

  constructor(private readonly auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {