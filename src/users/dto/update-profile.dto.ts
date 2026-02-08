import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiPropertyOptional({ example: 'John Doe', description: 'Full name of the user' })
    @IsOptional()
    @IsString()
    @MinLength(2, { message: 'Full name must be at least 2 characters long' })
    @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
    fullName?: string;

    @ApiPropertyOptional({ example: 'johndoe', description: 'Unique username' })
    @IsOptional()
    @IsString()
    @MinLength(3, { message: 'Username must be at least 3 characters long' })
    @MaxLength(30, { message: 'Username must not exceed 30 characters' })
    @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Username can only contain letters, numbers, underscores and hyphens' })
    username?: string;

    @ApiPropertyOptional({ example: '+1234567890', description: 'Phone number' })
    @IsOptional()
    @IsString()
    @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Phone number must be in valid E.164 format' })
    phone?: string;

    @ApiPropertyOptional({ example: 'en', description: 'Preferred language (en, fr, ar, etc.)' })
    @IsOptional()
    @IsString()
    @Matches(/^[a-z]{2}$/, { message: 'Language must be a 2-letter ISO 639-1 code' })
    preferredLanguage?: string;
}
