import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { SessionContext } from './entities/session-context.entity';
import { DecisionOutcome } from './entities/decision-outcome.entity';
import { SocialContextExposure } from './entities/social-context-exposure.entity';
import { Dissemination } from './entities/dissemination.entity';
import { ContentConsumption } from './entities/content-consumption.entity';
import { VerificationAction } from './entities/verification-action.entity';
import { ResponseTiming } from './entities/response-timing.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            SessionContext,
            DecisionOutcome,
            SocialContextExposure,
            Dissemination,
            ContentConsumption,
            VerificationAction,
            ResponseTiming,
        ])
    ],
    controllers: [TelemetryController],
    providers: [TelemetryService],
    exports: [TelemetryService]
})
export class TelemetryModule { }
