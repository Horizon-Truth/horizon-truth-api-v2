import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExportScenarioDto {
  @ApiProperty({
    description: 'Array of scenario IDs to export',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
