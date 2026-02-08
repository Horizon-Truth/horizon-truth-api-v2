import { IsObject, IsOptional, IsBoolean, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class NotificationPreferencesDto {
    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    email?: boolean;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    push?: boolean;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    sms?: boolean;
}

class PrivacyPreferencesDto {
    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    profileVisible?: boolean;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    activityVisible?: boolean;
}

export class UserPreferencesDto {
    @ApiPropertyOptional({ type: NotificationPreferencesDto })
    @IsOptional()
    @IsObject()
    notifications?: NotificationPreferencesDto;

    @ApiPropertyOptional({ type: PrivacyPreferencesDto })
    @IsOptional()
    @IsObject()
    privacy?: PrivacyPreferencesDto;

    @ApiPropertyOptional({ example: 'dark', enum: ['light', 'dark'] })
    @IsOptional()
    @IsString()
    @IsIn(['light', 'dark'])
    theme?: 'light' | 'dark';

    @ApiPropertyOptional({ example: 'en' })
    @IsOptional()
    @IsString()
    language?: string;
}
