import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ResourceType } from '../entities/resource.entity';
import { ContentLanguage } from '../../shared/enums/content-language.enum';

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

    @ApiProperty({
        enum: ContentLanguage,
        description:
            'Language of the resource. Required: a resource cannot be saved without a valid language.',
        example: ContentLanguage.ENGLISH,
    })
    @IsEnum(ContentLanguage, {
        message: 'language must be a supported language (en, am, om)',
    })
    language: ContentLanguage;

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
