import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { LeaderboardType } from '../../shared/enums/leaderboard-type.enum';
import { LeaderboardPeriod } from '../../shared/enums/leaderboard-period.enum';

@Entity('leaderboards')
export class Leaderboard {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ApiProperty({ enum: LeaderboardType })
    @Column({
        name: 'leaderboard_type',
        type: 'enum',
        enum: LeaderboardType,
    })
    leaderboardType: LeaderboardType;

    @ApiProperty({ example: 1250 })
    @Column({ type: 'int', default: 0 })
    score: number;

    @ApiPropertyOptional({ example: 5 })
    @Column({ type: 'int', nullable: true })
    rank: number;

    @ApiProperty({ enum: LeaderboardPeriod })
    @Column({
        type: 'enum',
        enum: LeaderboardPeriod,
    })
    period: LeaderboardPeriod;

    @ApiProperty()
    @CreateDateColumn({ name: 'calculated_at', type: 'timestamp' })
    calculatedAt: Date;
}
