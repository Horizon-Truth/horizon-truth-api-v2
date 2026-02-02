import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Avatar } from './avatar.entity';

@Entity('player_profiles')
export class PlayerProfile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', unique: true })
    userId: string;

    @OneToOne(() => User, (user) => user.playerProfile)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    nickname: string;

    @Column({ name: 'avatar_id' })
    avatarId: string;

    @ManyToOne(() => Avatar)
    @JoinColumn({ name: 'avatar_id' })
    avatar: Avatar;

    @Column({ name: 'fictional_region_id', type: 'uuid', nullable: true })
    fictionalRegionId: string;

    @Column({ name: 'trust_score_initial', type: 'int', default: 0 })
    trustScoreInitial: number;

    @Column({ name: 'onboarding_completed', type: 'boolean', default: false })
    onboardingCompleted: boolean;

    @Column({ name: 'onboarding_completed_at', type: 'timestamp', nullable: true })
    onboardingCompletedAt: Date;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
}
