import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { ReportTag } from './entities/report-tag.entity';
import { ReportVerification } from './entities/report-verification.entity';
import { ReportEvidence } from './entities/report-evidence.entity';
import { ReportTagsModule } from './report-tags.module';