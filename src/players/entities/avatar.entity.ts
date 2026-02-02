import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';
import { AvatarGender } from 'src/shared/enums/avatar-gender.enum';
import { AvatarAgeGroup } from 'src/shared/enums/avatar-age-group.enum';

@Entity('avatars')
export class Avatar {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ name: 'image_url', type: 'text' })
    imageUrl: string;

    @Column({
        type: 'enum',
        enum: AvatarGender,
    })
    gender: AvatarGender;

    @Column({
        name: 'age_group',
        type: 'enum',
        enum: AvatarAgeGroup,
    })
    ageGroup: AvatarAgeGroup;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
