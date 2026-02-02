import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToMany,
} from 'typeorm';
import { Scenario } from './scenario.entity';


@Entity('game_levels')
export class GameLevel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'level_number', type: 'int' })
    levelNumber: number;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'estimated_duration_minutes', type: 'int', nullable: true })
    estimatedDurationMinutes: number;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @OneToMany(() => Scenario, (scenario) => scenario.gameLevel)
    scenarios: Scenario[];
}
