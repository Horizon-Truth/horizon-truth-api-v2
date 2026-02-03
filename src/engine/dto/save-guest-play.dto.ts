import { IsUUID, IsString, IsNotEmpty, IsNumber, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveGuestPlayDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    @IsUUID()
    @IsNotEmpty()
    guestId: string;

    @ApiProperty({ example: 'scenario-uuid' })
    @IsUUID()
    @IsNotEmpty()
    scenarioId: string;

    @ApiProperty()
    @IsObject()
    @IsNotEmpty()
    choicesLog: any;

    @ApiProperty()
    @IsNumber()
    finalScore: number;

    @ApiProperty()
    @IsOptional()
    @IsObject()
    metadata?: any;
}
