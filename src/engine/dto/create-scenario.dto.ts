import { IsString, IsEnum, IsBoolean, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ScenarioType } from '../../shared/enums/scenario-type.enum';
import { ScenarioDifficulty } from '../../shared/enums/scenario-difficulty.enum';

export class CreateScenarioDto {
    @ApiProperty({ example: 'The Viral Hoax' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'A scenario about identifying fake news on social media.' })
    @IsString()
    description: string;

    @ApiProperty({ enum: ScenarioType })
    @IsEnum(ScenarioType)
    type: ScenarioType;

    @ApiProperty({ enum: ScenarioDifficulty })
    @IsEnum(ScenarioDifficulty)
    difficulty: ScenarioDifficulty;

    @ApiProperty({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
