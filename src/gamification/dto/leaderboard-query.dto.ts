import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LeaderboardType } from '../../shared/enums/leaderboard-type.enum';
import { LeaderboardPeriod } from '../../shared/enums/leaderboard-period.enum';

export class LeaderboardQueryDto {
    @ApiProperty({
        description: 'Type of leaderboard',
        enum: LeaderboardType,
        default: LeaderboardType.GAME_SCORE,
    })
    @IsOptional()
    @IsEnum(LeaderboardType)
    type: LeaderboardType = LeaderboardType.GAME_SCORE;

    @ApiProperty({
        description: 'Time period for leaderboard',
        enum: LeaderboardPeriod,
        default: LeaderboardPeriod.ALL_TIME,
    })
    @IsOptional()
    @IsEnum(LeaderboardPeriod)
    period: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME;

    @ApiPropertyOptional({
        description: 'Maximum number of results',
        default: 100,
        minimum: 1,
        maximum: 500,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(500)
    limit?: number = 100;
}
