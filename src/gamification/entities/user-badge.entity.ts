import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Badge } from './badge.entity';

@Entity('user_badges')
export class UserBadge {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'badge_id' })
    badgeId: string;

    @ManyToOne(() => Badge, (badge) => badge.userBadges)
    @JoinColumn({ name: 'badge_id' })
    badge: Badge;

    @Column({ name: 'earned_reason', type: 'text', nullable: true })
    earnedReason: string;

    @CreateDateColumn({ name: 'earned_at', type: 'timestamp' })
    earnedAt: Date;
}
