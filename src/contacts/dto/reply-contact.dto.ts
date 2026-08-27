import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ReplyContactDto {
  @ApiPropertyOptional({
    example: 'Re: General Inquiry',
    description: 'Defaults to "Re: <original subject>" when omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({ example: 'Thanks for reaching out — here is the answer.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(10000)
  message: string;
}
