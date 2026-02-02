import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Scenario } from './scenario.entity';

@Entity('game_levels')
export class GameLevel {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 1 })
    @Column({ name: 'level_number', type: 'int' })
    levelNumber: number;

    @ApiProperty({ example: 'The Basics of Misinformation' })
    @Column()
    name: string;

    @ApiPropertyOptional({ example: 'Introduction to identifying fake news and bias.' })
    @Column({ type: 'text', nullable: true })
    description: string;

    @ApiPropertyOptional({ example: 15 })
    @Column({ name: 'estimated_duration_minutes', type: 'int', nullable: true })
    estimatedDurationMinutes: number;

    @ApiProperty({ default: true })
    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @OneToMany(() => Scenario, (scenario) => scenario.gameLevel)
    @ApiProperty({ type: () => Scenario, isArray: true })
    scenarios: Scenario[];
}
