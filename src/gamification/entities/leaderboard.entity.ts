import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LeaderboardType } from '../../shared/enums/leaderboard-type.enum';
import { LeaderboardPeriod } from '../../shared/enums/leaderboard-period.enum';

@Entity('leaderboards')
export class Leaderboard {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({
        name: 'leaderboard_type',
        type: 'enum',
        enum: LeaderboardType,
    })
    leaderboardType: LeaderboardType;

    @Column({ type: 'int', default: 0 })
    score: number;

    @Column({ type: 'int', nullable: true })
    rank: number;

    @Column({
        type: 'enum',
        enum: LeaderboardPeriod,
    })
    period: LeaderboardPeriod;

    @CreateDateColumn({ name: 'calculated_at', type: 'timestamp' })
    calculatedAt: Date;
}
