import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateContactDto {
    @ApiProperty({ example: 'John' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    lastName: string;

    @ApiProperty({ example: 'john@example.com' })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'General Inquiry' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    subject: string;

    @ApiProperty({ example: 'Hello, I have a question.' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(1000)
    message: string;
}
