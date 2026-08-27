import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { ReportTag } from './entities/report-tag.entity';
import { ReportVerification } from './entities/report-verification.entity';
import { ReportEvidence } from './entities/report-evidence.entity';
import { ReportAiVerification } from './entities/report-ai-verification.entity';
import { ReportTagsModule } from './report-tags.module';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AiVerificationService } from './ai-verification.service';
import { AiVerificationClient } from './ai-verification.client';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Report,
      ReportTag,
      ReportVerification,
      ReportEvidence,
      ReportAiVerification,
    ]),
    ReportTagsModule,
    AuditLogsModule,
    // AiVerificationClient reads its endpoint/timeout from config, and
    // ConfigModule is not registered globally in this app.
    ConfigModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, AiVerificationService, AiVerificationClient],
  exports: [ReportsService, AiVerificationService, ReportTagsModule],
})
export class ReportsModule {}
