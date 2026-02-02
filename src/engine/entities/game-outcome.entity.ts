import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlayerChoice } from './player-choice.entity';
import { OutcomeType } from '../../shared/enums/outcome-type.enum';

@Entity('game_outcomes')
export class GameOutcome {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'player_choice_id' })
    playerChoiceId: string;

    @ManyToOne(() => PlayerChoice, (choice) => choice.outcomes)
    @JoinColumn({ name: 'player_choice_id' })
    playerChoice: PlayerChoice;

    @ApiProperty({ enum: OutcomeType })
    @Column({
        name: 'outcome_type',
        type: 'enum',
        enum: OutcomeType,
    })
    outcomeType: OutcomeType;

    @ApiProperty({ example: 10 })
    @Column({ name: 'trust_score_delta', type: 'int', default: 0 })
    trustScoreDelta: number;

    @ApiPropertyOptional({ example: 'Great job! You identified a potential fake news source.' })
    @Column({ type: 'text', nullable: true })
    message: string;

    @ApiPropertyOptional({ default: false })
    @Column({ name: 'end_scenario', type: 'boolean', default: false })
    endScenario: boolean;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
