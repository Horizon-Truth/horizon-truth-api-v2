import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { ReportTag } from './entities/report-tag.entity';
import { ReportVerification } from './entities/report-verification.entity';
import { ReportTagsModule } from './report-tags.module';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Report, ReportTag, ReportVerification]), ReportTagsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService, ReportTagsModule],
})
export class ReportsModule { }
