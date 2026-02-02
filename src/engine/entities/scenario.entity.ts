import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GameLevel } from './game-level.entity';
import { ScenarioType } from '../../shared/enums/scenario-type.enum';
import { ScenarioDifficulty } from '../../shared/enums/scenario-difficulty.enum';
import { Scene } from './scene.entity';

@Entity('scenarios')
export class Scenario {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'game_level_id' })
    gameLevelId: string;

    @ManyToOne(() => GameLevel, (level) => level.scenarios)
    @JoinColumn({ name: 'game_level_id' })
    gameLevel: GameLevel;

    @ApiProperty({ example: 'The Viral Hoax' })
    @Column()
    title: string;

    @ApiPropertyOptional({ example: 'Investigate a suspicious post spreading on social media.' })
    @Column({ type: 'text', nullable: true })
    description: string;

    @ApiProperty({ enum: ScenarioType })
    @Column({
        name: 'scenario_type',
        type: 'enum',
        enum: ScenarioType,
    })
    scenarioType: ScenarioType;

    @ApiProperty({ enum: ScenarioDifficulty })
    @Column({
        type: 'enum',
        enum: ScenarioDifficulty,
    })
    difficulty: ScenarioDifficulty;

    @ApiProperty({ default: true })
    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @OneToMany(() => Scene, (scene) => scene.scenario)
    @ApiProperty({ type: () => Scene, isArray: true })
    scenes: Scene[];
}
