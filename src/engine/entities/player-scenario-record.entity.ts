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