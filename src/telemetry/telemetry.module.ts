import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { SessionContext } from './entities/session-context.entity';
import { DecisionOutcome } from './entities/decision-outcome.entity';