import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BadgeCategory } from '../../shared/enums/badge-category.enum';
import { UserBadge } from './user-badge.entity';

@Entity('badges')
export class Badge {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'FIRST_REPORT' })
    @Column({ unique: true })
    code: string;

    @ApiProperty({ example: 'Eagle Eye' })
    @Column()
    name: string;

    @ApiPropertyOptional({ example: 'Awarded for your first verified report.' })
    @Column({ type: 'text', nullable: true })
    description: string;

    @ApiPropertyOptional({ example: 'https://example.com/icons/eagle-eye.png' })
    @Column({ name: 'icon_url', type: 'text', nullable: true })
    iconUrl: string;

    @ApiProperty({ enum: BadgeCategory })
    @Column({
        type: 'enum',
        enum: BadgeCategory,
    })
    category: BadgeCategory;

    @ApiProperty({ default: true })
    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @OneToMany(() => UserBadge, (userBadge) => userBadge.badge)
    @ApiProperty({ type: () => UserBadge, isArray: true })
    userBadges: UserBadge[];
}
