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
import { Scenario } from './scenario.entity';
import { SceneContentType } from '../../shared/enums/scene-content-type.enum';
import { SceneContent } from './scene-content.entity';
import { PlayerChoice } from './player-choice.entity';


@Entity('scenes')
export class Scene {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'scenario_id' })
    scenarioId: string;

    @ManyToOne(() => Scenario, (scenario) => scenario.scenes)
    @JoinColumn({ name: 'scenario_id' })
    scenario: Scenario;

    @Column({ name: 'scene_order', type: 'int' })
    sceneOrder: number;

    @Column({
        name: 'content_type',
        type: 'enum',
        enum: SceneContentType,
    })
    contentType: SceneContentType;

    @Column({ name: 'is_terminal', type: 'boolean', default: false })
    isTerminal: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @OneToOne(() => SceneContent, (content) => content.scene)
    content: SceneContent;

    @OneToMany(() => PlayerChoice, (choice) => choice.scene)
    choices: PlayerChoice[];
}
