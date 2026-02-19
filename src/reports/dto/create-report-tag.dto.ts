import { IsString, IsNotEmpty, IsBoolean, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReportTagDto {
    @ApiProperty({ example: 'Misinformation' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'misinformation' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-z0-9-]+$/, {
        message: 'slug must contain only lowercase letters, numbers, and hyphens',
    })
    slug: string;

    @ApiProperty({ default: true, required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
