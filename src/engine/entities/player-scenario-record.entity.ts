import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Scenario } from './scenario.entity';

@Entity('player_scenario_records')
@Unique(['userId', 'scenarioId'])
export class PlayerScenarioRecord {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'scenario_id' })
    scenarioId: string;

    @ManyToOne(() => Scenario)
    @JoinColumn({ name: 'scenario_id' })
    scenario: Scenario;

    @ApiProperty({ example: 100 })
    @Column({ name: 'best_score', type: 'int', default: 0 })
    bestScore: number;

    @ApiProperty({ example: 85 })
    @Column({ name: 'best_accuracy_rate', type: 'int', default: 0 })
    bestAccuracyRate: number;

    @ApiProperty({ example: 250 })
    @Column({ name: 'best_influence', type: 'int', default: 0 })
    bestInfluence: number;

    @ApiProperty({ example: true })
    @Column({ name: 'is_completed', type: 'boolean', default: false })
    isCompleted: boolean;

    @ApiProperty({ example: 3 })
    @Column({ type: 'int', default: 1 })
    attempts: number;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @ApiProperty()
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
}
