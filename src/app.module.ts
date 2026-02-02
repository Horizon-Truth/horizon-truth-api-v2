import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

import { OrganizationsModule } from './organizations/organizations.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { PlayersModule } from './players/players.module';
import { EngineModule } from './engine/engine.module';
import { IncidentsModule } from './incidents/incidents.module';
import { GamificationModule } from './gamification/gamification.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'better-sqlite3',
        database: configService.get<string>('DATABASE_NAME'),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
