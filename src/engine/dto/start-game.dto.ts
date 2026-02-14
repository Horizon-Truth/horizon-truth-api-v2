import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartGameDto {
    @ApiProperty({
        description: 'ID of the scenario to start',
        example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    })
    @IsUUID()
    scenarioId: string;
}
