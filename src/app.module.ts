import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AuditLogInterceptor } from './audit-logs/interceptors/audit-log.interceptor';

import { OrganizationsModule } from './organizations/organizations.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { PlayersModule } from './players/players.module';
import { EngineModule } from './engine/engine.module';
import { IncidentsModule } from './incidents/incidents.module';
import { GamificationModule } from './gamification/gamification.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SeederModule } from './database/seeders/seeder.module';
import { ReportsModule } from './reports/reports.module';
import { LanguagesModule } from './reports/languages.module';
import { FeedbackModule } from './feedback/feedback.module';
import { BlogsModule } from './blogs/blogs.module';
import { ResourcesModule } from './resources/resources.module';
import { ContactsModule } from './contacts/contacts.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute window
        limit: 100, // 100 requests per minute per IP (much more reasonable)
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    OrganizationsModule,
    AuditLogsModule,
    PlayersModule,
    EngineModule,
    IncidentsModule,
    GamificationModule,
    AnalyticsModule,
    SeederModule,
    ReportsModule,
    LanguagesModule,
    FeedbackModule,
    BlogsModule,
    ResourcesModule,
    ContactsModule,
    NewsletterModule,
    TelemetryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule { }
