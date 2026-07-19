import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddEvidenceDto {
  @ApiProperty({ example: 'LINK' })
  @IsString()
  @IsNotEmpty()
  evidenceType: string;

  @ApiProperty({ example: 'https://example.com/evidence' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 'EXTERNAL' })
  @IsString()
  @IsOptional()
  sourceType?: string;

  @ApiPropertyOptional({ example: 75 })
  @IsOptional()
  credibilityScore?: number;

  @ApiPropertyOptional({ example: 'PENDING' })
  @IsString()
  @IsOptional()
  verificationStatus?: string;
}
