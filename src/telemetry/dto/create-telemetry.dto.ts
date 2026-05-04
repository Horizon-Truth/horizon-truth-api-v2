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

export class SocialContextExposureDto {
    @IsEnum(SocialContextExposureType)
    @IsOptional()
    social_context_exposed?: SocialContextExposureType;

    @IsBoolean()
    @IsOptional()
    social_metrics_visible?: boolean;

    @IsInt()
    @IsOptional()
    like_count_shown?: number;

    @IsInt()
    @IsOptional()
    share_count_shown?: number;

    @IsInt()
    @IsOptional()
    comment_count_shown?: number;

    @IsString()
    @IsOptional()
    highlighted_comment_type?: string;

    @IsBoolean()
    @IsOptional()
    authority_badge_visible?: boolean;
}

export class DisseminationDto {
    @IsBoolean()
    @IsOptional()
    share_clicked?: boolean;

    @IsEnum(ShareChannelType)
    @IsOptional()
    share_channel_type?: ShareChannelType;

    @IsInt()
    @IsOptional()
    share_count?: number;

    @IsInt()
    @IsOptional()
    forward_count?: number;

    @IsBoolean()
    @IsOptional()
    share_with_context?: boolean;

    @IsInt()
    @IsOptional()
    estimated_audience_size?: number;

    @IsBoolean()