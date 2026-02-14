import { IsString, IsEmail, MinLength, MaxLength, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail({}, { message: 'Invalid email address' })
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'johndoe' })
    @IsString()
    @MinLength(3, { message: 'Username must be at least 3 characters long' })
    @MaxLength(20, { message: 'Username cannot exceed 20 characters' })
    @IsNotEmpty()
    username: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
    @Matches(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character' })
    @IsNotEmpty()
    password: string;

    @ApiProperty({ example: 'John Doe' })
    @IsString()
    @MinLength(2, { message: 'Full name must be at least 2 characters long' })
    @IsNotEmpty()
    fullName: string;
}
