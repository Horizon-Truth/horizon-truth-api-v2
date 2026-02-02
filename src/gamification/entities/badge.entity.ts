import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToMany,
} from 'typeorm';
import { BadgeCategory } from '../../shared/enums/badge-category.enum';
import { UserBadge } from './user-badge.entity';

@Entity('badges')
export class Badge {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    code: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'icon_url', type: 'text', nullable: true })
    iconUrl: string;

    @Column({
        type: 'enum',
        enum: BadgeCategory,
    })
    category: BadgeCategory;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @OneToMany(() => UserBadge, (userBadge) => userBadge.badge)
    userBadges: UserBadge[];
}
