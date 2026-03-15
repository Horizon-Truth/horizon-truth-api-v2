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