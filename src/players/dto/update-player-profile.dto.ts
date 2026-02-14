import { IsString, Length, IsUUID, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlayerProfileDto {
    @ApiPropertyOptional({
        description: 'Player nickname',
        example: 'FactChecker99',
        minLength: 3,
        maxLength: 20,
    })
    @IsOptional()
    @IsString()
    @Length(3, 20)
    nickname?: string;

    @ApiPropertyOptional({
        description: 'Avatar ID',
        example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    })
    @IsOptional()
    @IsUUID()
    avatarId?: string;

    @ApiPropertyOptional({
        description: 'Fictional region ID',
        example: 'a1b2c3d4-1234-5678-90ab-cdef12345678',
    })
    @IsOptional()
    @IsUUID()
    fictionalRegionId?: string;
}
