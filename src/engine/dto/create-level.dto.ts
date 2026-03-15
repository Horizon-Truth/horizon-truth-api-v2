import { IsString, IsInt, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLevelDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  levelNumber: number;

  @ApiProperty({ example: 'The Basics of Misinformation' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Introduction to identifying fake news and bias.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsInt()
  @IsOptional()
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
