import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AvatarGender } from '../../shared/enums/avatar-gender.enum';
import { AvatarAgeGroup } from '../../shared/enums/avatar-age-group.enum';

@Entity('avatars')
export class Avatar {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'Eco-Warrior' })
    @Column()
    name: string;

    @ApiProperty({ example: 'https://example.com/avatar.png' })
    @Column({ name: 'image_url', type: 'text' })
    imageUrl: string;

    @ApiProperty({ enum: AvatarGender })
    @Column({
        type: 'enum',
        enum: AvatarGender,
    })
    gender: AvatarGender;

    @ApiProperty({ enum: AvatarAgeGroup })
    @Column({
        name: 'age_group',
        type: 'enum',
        enum: AvatarAgeGroup,
    })
    ageGroup: AvatarAgeGroup;

    @ApiProperty({ default: true })
    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
