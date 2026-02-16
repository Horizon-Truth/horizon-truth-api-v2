import { IsString, Length, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlayerProfileDto {
    @ApiProperty({
        description: 'Player nickname',
        example: 'FactChecker99',
        minLength: 3,
        maxLength: 20,
    })
    @IsString()
    @Length(3, 20)
    nickname: string;

    @ApiProperty({
        description: 'Avatar ID',
        example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    })
    @IsUUID()
    avatarId: string;

    @ApiPropertyOptional({
        description: 'Fictional region ID (optional)',
        example: 'a1b2c3d4-1234-5678-90ab-cdef12345678',
    })
    @IsOptional()
    @IsUUID()
    fictionalRegionId?: string;
}
