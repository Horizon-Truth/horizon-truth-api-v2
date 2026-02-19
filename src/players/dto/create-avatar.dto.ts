import { IsString, IsUrl, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AvatarGender } from '../../shared/enums/avatar-gender.enum';
import { AvatarAgeGroup } from '../../shared/enums/avatar-age-group.enum';

export class CreateAvatarDto {
    @ApiProperty({ example: 'Eco-Warrior' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'https://example.com/avatar.png' })
    @IsUrl()
    imageUrl: string;

    @ApiProperty({ enum: AvatarGender })
    @IsEnum(AvatarGender)
    gender: AvatarGender;

    @ApiProperty({ enum: AvatarAgeGroup })
    @IsEnum(AvatarAgeGroup)
    ageGroup: AvatarAgeGroup;

    @ApiProperty({ default: true, required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
