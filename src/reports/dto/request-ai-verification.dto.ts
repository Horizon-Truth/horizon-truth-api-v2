import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RequestAiVerificationDto {
  @ApiPropertyOptional({
    example: false,
    description:
      'Run a new attempt even though a result already exists. Without it the request is idempotent: an existing result is returned without calling the AI service again.',
  })
  @IsBoolean()
  @IsOptional()
  force?: boolean;
}
