import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Scene } from './scene.entity';
import { PlayerActionType } from '../../shared/enums/player-action-type.enum';
import { GameOutcome } from './game-outcome.entity';


@Entity('player_choices')
export class PlayerChoice {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'scene_id' })
    sceneId: string;

    @ManyToOne(() => Scene, (scene) => scene.choices)
    @JoinColumn({ name: 'scene_id' })
    scene: Scene;

    @Column()
    label: string;

    @Column({
        name: 'action_type',
        type: 'enum',
        enum: PlayerActionType,
    })
    actionType: PlayerActionType;

    @Column({ name: 'next_scene_id', type: 'uuid', nullable: true })
    nextSceneId: string;

    @ManyToOne(() => Scene)
    @JoinColumn({ name: 'next_scene_id' })
    nextScene: Scene;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @OneToMany(() => GameOutcome, (outcome) => outcome.playerChoice)
    outcomes: GameOutcome[];
}
