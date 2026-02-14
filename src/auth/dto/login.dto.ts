import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email or Username' })
    @IsString()
    @IsNotEmpty({ message: 'Email or Username is required' })
    email: string;

    @ApiProperty({ example: 'password123' })
    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    password: string;
}
