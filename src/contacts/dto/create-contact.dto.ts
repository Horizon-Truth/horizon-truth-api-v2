import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateContactDto {
    @ApiProperty({ example: 'John' })
    @IsNotEmpty()
    @IsString()