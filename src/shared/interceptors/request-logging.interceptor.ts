import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const userId = request.user?.userId || 'anonymous';
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        const duration = Date.now() - startTime;

        const logLevel =
          statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';

        this.logger[logLevel](
          `${method} ${url} ${statusCode} ${duration}ms - ${ip} - ${userId} - ${userAgent.substring(0, 80)}`,
        );
      }),
    );
  }
}
