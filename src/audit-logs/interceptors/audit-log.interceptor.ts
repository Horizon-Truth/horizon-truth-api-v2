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
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user, ip } = request;
    const userAgent = request.headers['user-agent'];

    // We only log non-GET requests for admin/moderator operations
    // and we exclude game-playing related endpoints if they are too noisy
    const isAdministrativeAction = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const isAdminUser = user && [UserRole.SYSTEM_ADMIN, UserRole.MODERATOR, UserRole.ORG_ADMIN].includes(user.role);

    // Exclude game submission if it's too frequent (though usually it's not under these roles)
    const isGameSubmission = url.includes('/engine/submit') || url.includes('/engine/start');

    if (isAdministrativeAction && isAdminUser && !isGameSubmission) {
      return next.handle().pipe(
        tap({
          next: (data) => {
            this.logAction(user, method, url, body, data, ip, userAgent);
          },
          error: (error) => {
            // Optionally log errors too
            this.logger.error(`Error in administrative action ${method} ${url}: ${error.message}`);
          },
        }),
      );
    }

    return next.handle();
  }

  private async logAction(user: any, method: string, url: string, body: any, responseData: any, ip: string, userAgent: string) {
    try {
      // Determine entity type and ID from URL or response
      const urlParts = url.split('/').filter(p => p);
      const entityType = urlParts[0] || 'unknown';
      
      // Try to find an ID in the URL or the response data
      const entityId = urlParts[1] || responseData?.id || responseData?.uuid || 'n/a';

      const action = `${method} ${url}`;

      await this.auditLogsService.createLog({
        userId: user.userId,
        action,
        entityType,
        entityId: String(entityId),
        metadata: {
          requestBody: this.sanitizeBody(body),
          response: this.sanitizeResponse(responseData),
        },
        ipAddress: ip,
        userAgent,
      });
    } catch (err) {
      this.logger.error(`Failed to create audit log: ${err.message}`);
    }
  }

  private sanitizeBody(body: any) {
    if (!body) return null;
    const sanitized = { ...body };
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
    sensitiveFields.forEach(field => {
      if (field in sanitized) sanitized[field] = '[REDACTED]';
    });
    return sanitized;
  }

  private sanitizeResponse(data: any) {
    if (!data) return null;
    // For large responses, we might want to truncate or selective log
    if (Array.isArray(data)) return { count: data.length, note: 'List response' };
    return data;
  }
}
