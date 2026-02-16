import { IsUUID, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AwardBadgeDto {
    @ApiProperty({
        description: 'User ID to award badge to',
        example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    })
    @IsUUID()
    userId: string;

    @ApiProperty({
        description: 'Badge code to award',
        example: 'FIRST_GAME',
    })
    @IsString()
    badgeCode: string;

    @ApiPropertyOptional({
        description: 'Additional metadata about the award',
        example: { reason: 'Completed first scenario', score: 100 },
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
