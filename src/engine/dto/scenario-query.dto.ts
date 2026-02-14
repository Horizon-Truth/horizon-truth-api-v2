import { IsOptional, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ScenarioDifficulty } from '../../shared/enums/scenario-difficulty.enum';
import { ScenarioType } from '../../shared/enums/scenario-type.enum';

export class ScenarioQueryDto {
    @ApiPropertyOptional({
        description: 'Filter by scenario difficulty',
        enum: ScenarioDifficulty,
    })
    @IsOptional()
    @IsEnum(ScenarioDifficulty)
    difficulty?: ScenarioDifficulty;

    @ApiPropertyOptional({
        description: 'Filter by scenario type',
        enum: ScenarioType,
    })
    @IsOptional()
    @IsEnum(ScenarioType)
    scenarioType?: ScenarioType;

    @ApiPropertyOptional({
        description: 'Filter active scenarios only',
        default: true,
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean = true;

    @ApiPropertyOptional({
        description: 'Page number for pagination',
        default: 1,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Number of items per page',
        default: 10,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}
