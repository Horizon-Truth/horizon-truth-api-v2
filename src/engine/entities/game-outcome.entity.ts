import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { PlayerChoice } from './player-choice.entity';
import { OutcomeType } from '../../shared/enums/outcome-type.enum';

@Entity('game_outcomes')
export class GameOutcome {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'player_choice_id' })
    playerChoiceId: string;

    @ManyToOne(() => PlayerChoice, (choice) => choice.outcomes)
    @JoinColumn({ name: 'player_choice_id' })
    playerChoice: PlayerChoice;

    @Column({
        name: 'outcome_type',
        type: 'enum',
        enum: OutcomeType,
    })
    outcomeType: OutcomeType;

    @Column({ name: 'trust_score_delta', type: 'int', default: 0 })
    trustScoreDelta: number;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({ name: 'end_scenario', type: 'boolean', default: false })
    endScenario: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
