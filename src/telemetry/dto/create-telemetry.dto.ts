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
    @IsOptional()
    re_share_enabled?: boolean;
}

export class ContentConsumptionDto {
    @IsInt()
    @IsOptional()
    scroll_depth_percent?: number;

    @IsInt()
    @IsOptional()
    text_dwell_time_ms?: number;

    @IsInt()
    @IsOptional()
    paragraphs_viewed?: number;

    @IsInt()
    @IsOptional()
    back_scroll_count?: number;
}

export class VerificationDto {
    @IsInt()
    @IsOptional()
    source_button_clicked_count?: number;

    @IsBoolean()
    @IsOptional()
    learn_more_opened?: boolean;

    @IsInt()
    @IsOptional()
    fact_panel_views?: number;

    @IsBoolean()
    @IsOptional()
    external_link_clicked?: boolean;

    @IsBoolean()
    @IsOptional()
    profile_checked?: boolean;

    @IsDateString()
    @IsOptional()
    verification_start_timestamp?: string;

    @IsDateString()
    @IsOptional()
    verification_end_timestamp?: string;

    @IsInt()
    @IsOptional()
    verification_time_ms?: number;

    @IsInt()
    @IsOptional()
    verification_sequence_length?: number;
}

export class ResponseTimingDto {
    @IsDateString()
    @IsOptional()
    content_shown_timestamp?: string;

    @IsDateString()
    @IsOptional()
    first_action_timestamp?: string;

    @IsDateString()
    @IsOptional()
    final_decision_timestamp?: string;

    @IsInt()
    @IsOptional()
    time_to_first_action_ms?: number;

    @IsInt()
    @IsOptional()
    time_to_final_decision_ms?: number;
}

export class CreateTelemetryPayloadDto {
    @IsString()
    @IsNotEmpty()
    session_id: string;

    @ValidateNested()
    @Type(() => SessionContextDto)
    @IsOptional()
    session_context?: SessionContextDto;

    @ValidateNested()
    @Type(() => DecisionOutcomeDto)
    @IsOptional()
    decision_outcome?: DecisionOutcomeDto;

    @ValidateNested()
    @Type(() => SocialContextExposureDto)
    @IsOptional()
    social_context?: SocialContextExposureDto;

    @ValidateNested()
    @Type(() => DisseminationDto)
    @IsOptional()
    dissemination?: DisseminationDto;

    @ValidateNested()
    @Type(() => ContentConsumptionDto)
    @IsOptional()
    content_consumption?: ContentConsumptionDto;

    @ValidateNested()
    @Type(() => VerificationDto)
    @IsOptional()
    verification?: VerificationDto;

    @ValidateNested()
    @Type(() => ResponseTimingDto)
    @IsOptional()
    response_timing?: ResponseTimingDto;
}
