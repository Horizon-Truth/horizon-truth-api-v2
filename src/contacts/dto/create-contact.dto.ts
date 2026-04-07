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