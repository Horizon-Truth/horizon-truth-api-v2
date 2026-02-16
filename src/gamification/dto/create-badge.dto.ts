import { IsString, IsEnum, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BadgeCategory } from '../../shared/enums/badge-category.enum';

export class CreateBadgeDto {
    @ApiProperty({ example: 'TRUTH_SEEKER' })
    @IsString()
    code: string;

    @ApiProperty({ example: 'Truth Seeker' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'Awarded for completing the first scenario.' })
    @IsString()
    description: string;

    @ApiProperty({ example: '/badges/truth-seeker.png' })
    @IsString()
    iconUrl: string;

    @ApiProperty({ enum: BadgeCategory })
    @IsEnum(BadgeCategory)
    category: BadgeCategory;

    @ApiProperty({ example: 100 })
    @IsInt()
    @Min(0)
    xpValue: number;

    @ApiProperty({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
