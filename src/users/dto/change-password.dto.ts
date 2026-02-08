import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty({ example: 'OldP@ssw0rd!', description: 'Current password' })
    @IsString()
    @MinLength(8)
    currentPassword: string;

    @ApiProperty({ example: 'NewP@ssw0rd!', description: 'New password' })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    })
    newPassword: string;
}
