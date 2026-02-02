import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { GameLevel } from './game-level.entity';
import { ScenarioType } from '../../shared/enums/scenario-type.enum';
import { ScenarioDifficulty } from '../../shared/enums/scenario-difficulty.enum';
import { Scene } from './scene.entity';

@Entity('scenarios')
export class Scenario {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'game_level_id' })
    gameLevelId: string;

    @ManyToOne(() => GameLevel, (level) => level.scenarios)
    @JoinColumn({ name: 'game_level_id' })
    gameLevel: GameLevel;

    @Column()
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        name: 'scenario_type',
        type: 'enum',
        enum: ScenarioType,
    })
    scenarioType: ScenarioType;

    @Column({
        type: 'enum',
        enum: ScenarioDifficulty,
    })
    difficulty: ScenarioDifficulty;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @OneToMany(() => Scene, (scene) => scene.scenario)
    scenes: Scene[];
}
