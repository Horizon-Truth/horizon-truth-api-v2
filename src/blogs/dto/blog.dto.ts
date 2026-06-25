import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ContentLanguage } from '../../shared/enums/content-language.enum';

export class CreateBlogDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    slug: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    excerpt: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    authorName: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    authorRole: string;

    @ApiPropertyOptional()
    @IsUrl()
    @IsOptional()
    authorAvatar?: string;

    @ApiPropertyOptional()
    @IsUrl()
    @IsOptional()
    imageUrl?: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    category: string;

    @ApiProperty({
        enum: ContentLanguage,
        description:
            'Language of the blog post. Required: a blog cannot be saved without a valid language.',
        example: ContentLanguage.ENGLISH,
    })
    @IsEnum(ContentLanguage, {
        message: 'language must be a supported language (en, am, om)',
    })
    language: ContentLanguage;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    readTime: string;
}

export class UpdateBlogDto extends CreateBlogDto { }
