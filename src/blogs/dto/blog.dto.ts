import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

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

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    readTime: string;
}

export class UpdateBlogDto extends CreateBlogDto { }
