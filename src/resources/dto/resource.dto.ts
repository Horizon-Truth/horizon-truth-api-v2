import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ResourceType } from '../entities/resource.entity';

export class CreateResourceDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    slug: string;

    @ApiProperty({ enum: ResourceType })
    @IsEnum(ResourceType)
    type: ResourceType;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    duration: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    badge?: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    icon: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    fullContent?: string;

    @ApiPropertyOptional()
    @IsUrl()
    @IsOptional()
    linkUrl?: string;
}

export class UpdateResourceDto extends CreateResourceDto { }
