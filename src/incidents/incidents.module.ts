import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from './entities/content.entity';
import { IncidentReport } from './entities/incident-report.entity';
import { IncidentStatus } from './entities/incident-status.entity';
import { ModerationAction } from './entities/moderation-action.entity';

@Module({
  imports: [