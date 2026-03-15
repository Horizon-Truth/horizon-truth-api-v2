import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean, IsInt, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceType, NetworkState } from '../entities/session-context.entity';
import { DecisionType } from '../entities/decision-outcome.entity';
import { SocialContextExposureType } from '../entities/social-context-exposure.entity';
import { ShareChannelType } from '../entities/dissemination.entity';

export class SessionContextDto {
    @IsString()
    @IsNotEmpty()
    player_id: string;

    @IsString()
    @IsNotEmpty()
    level_id: string;

    @IsString()
    @IsNotEmpty()
    content_id: string;

    @IsEnum(DeviceType)
    device_type: DeviceType;

    @IsEnum(NetworkState)
    network_state: NetworkState;
}

export class DecisionOutcomeDto {
    @IsEnum(DecisionType)
    @IsOptional()
    player_decision_type?: DecisionType;

    @IsInt()
    @IsOptional()
    decision_confidence_level?: number;

    @IsBoolean()
    @IsOptional()
    decision_changed?: boolean;

    @IsInt()
    @IsOptional()
    decision_change_count?: number;
}
