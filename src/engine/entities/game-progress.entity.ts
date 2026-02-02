import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Scenario } from './scenario.entity';
import { Scene } from './scene.entity';
import { GameProgressStatus } from '../../shared/enums/game-progress-status.enum';
import { OutcomeType } from '../../shared/enums/outcome-type.enum';

@Entity('game_progress')
export class GameProgress {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'scenario_id' })
    scenarioId: string;

    @ManyToOne(() => Scenario)
    @JoinColumn({ name: 'scenario_id' })
    scenario: Scenario;

    @Column({ name: 'current_scene_id', nullable: true })
    currentSceneId: string;

    @ManyToOne(() => Scene)
    @JoinColumn({ name: 'current_scene_id' })
    currentScene: Scene;

    @Column({
        type: 'enum',
        enum: GameProgressStatus,
        default: GameProgressStatus.IN_PROGRESS,
    })
    status: GameProgressStatus;

    @Column({
        name: 'final_outcome',
        type: 'enum',
        enum: OutcomeType,
        nullable: true,
    })
    finalOutcome: OutcomeType;

    @CreateDateColumn({ name: 'started_at', type: 'timestamp' })
    startedAt: Date;

    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completedAt: Date;
}
