import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionContext } from './entities/session-context.entity';
import { DecisionOutcome } from './entities/decision-outcome.entity';
import { SocialContextExposure } from './entities/social-context-exposure.entity';
import { Dissemination } from './entities/dissemination.entity';
import { ContentConsumption } from './entities/content-consumption.entity';
import { VerificationAction } from './entities/verification-action.entity';
import { ResponseTiming } from './entities/response-timing.entity';
import { CreateTelemetryPayloadDto } from './dto/create-telemetry.dto';

@Injectable()
export class TelemetryService {
    private readonly logger = new Logger(TelemetryService.name);

    constructor(
        @InjectRepository(SessionContext)
        private sessionContextRepo: Repository<SessionContext>,
        @InjectRepository(DecisionOutcome)
        private decisionOutcomeRepo: Repository<DecisionOutcome>,
        @InjectRepository(SocialContextExposure)
        private socialContextRepo: Repository<SocialContextExposure>,
        @InjectRepository(Dissemination)
        private disseminationRepo: Repository<Dissemination>,
        @InjectRepository(ContentConsumption)
        private consumptionRepo: Repository<ContentConsumption>,
        @InjectRepository(VerificationAction)
        private verificationRepo: Repository<VerificationAction>,
        @InjectRepository(ResponseTiming)
        private timingRepo: Repository<ResponseTiming>,
    ) { }

    async processTelemetryPayload(payload: CreateTelemetryPayloadDto): Promise<void> {
        const { session_id } = payload;
        try {
            if (payload.session_context) {
                await this.sessionContextRepo.save({ session_id, ...payload.session_context });
            }
            if (payload.decision_outcome) {
                await this.decisionOutcomeRepo.save({ session_id, ...payload.decision_outcome });
            }
            if (payload.social_context) {
                await this.socialContextRepo.save({ session_id, ...payload.social_context });
            }
            if (payload.dissemination) {
                await this.disseminationRepo.save({ session_id, ...payload.dissemination });
            }
            if (payload.content_consumption) {
                await this.consumptionRepo.save({ session_id, ...payload.content_consumption });
            }
            if (payload.verification) {
                await this.verificationRepo.save({ session_id, ...payload.verification });
            }
            if (payload.response_timing) {
                await this.timingRepo.save({ session_id, ...payload.response_timing });
            }
        } catch (error) {
            this.logger.error(`Error saving telemetry for session ${session_id}`, error.stack);
        }
    }
}
