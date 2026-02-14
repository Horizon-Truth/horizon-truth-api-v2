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
import { Scenario } from './scenario.entity';
import { Scene } from './scene.entity';

@Entity('player_actions')
export class PlayerAction {
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

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'scene_id' })
    sceneId: string;

    @ManyToOne(() => Scene)
    @JoinColumn({ name: 'scene_id' })
    scene: Scene;

    @ApiProperty({ example: 'VERIFY' })
    @Column({ name: 'choice_key' })
    choiceKey: string;

    @ApiPropertyOptional({ example: { timeSpent: 45, confidence: 'high' } })
    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
