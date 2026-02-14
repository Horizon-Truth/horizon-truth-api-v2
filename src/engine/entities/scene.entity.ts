import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    OneToOne,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Scenario } from './scenario.entity';
import { SceneContentType } from '../../shared/enums/scene-content-type.enum';
import { SceneContent } from './scene-content.entity';
import { PlayerChoice } from './player-choice.entity';

@Entity('scenes')
export class Scene {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'scenario_id' })
    scenarioId: string;

    @ManyToOne(() => Scenario, (scenario) => scenario.scenes)
    @JoinColumn({ name: 'scenario_id' })
    scenario: Scenario;

    @ApiProperty({ example: 'Social Media Investigation' })
    @Column({ nullable: true })
    title: string;

    @ApiProperty({ example: 'You see a viral post on social media...' })
    @Column({ type: 'text', nullable: true })
    description: string;

    @ApiProperty({ example: 1 })
    @Column({ name: 'order', type: 'int', default: 1 })
    order: number;

    @ApiProperty({ example: 'INVESTIGATION' })
    @Column({ name: 'scene_type', type: 'varchar', nullable: true })
    sceneType: string;

    @ApiProperty({ enum: SceneContentType })
    @Column({
        name: 'content_type',
        type: 'enum',
        enum: SceneContentType,
    })
    contentType: SceneContentType;

    @ApiProperty({ example: ['VERIFY', 'SHARE', 'IGNORE'], isArray: true })
    @Column({ name: 'available_choices', type: 'jsonb', nullable: true })
    availableChoices: string[];

    @ApiProperty({ default: false })
    @Column({ name: 'is_terminal', type: 'boolean', default: false })
    isTerminal: boolean;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @OneToOne(() => SceneContent, (content) => content.scene)
    @ApiProperty({ type: () => SceneContent })
    content: SceneContent;

    @OneToMany(() => PlayerChoice, (choice) => choice.scene)
    @ApiProperty({ type: () => PlayerChoice, isArray: true })
    choices: PlayerChoice[];
}
