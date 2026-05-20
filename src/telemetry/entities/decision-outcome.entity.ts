import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

export enum DecisionType {
    TRUST = 'trust',
    DISTRUST = 'distrust',
    SHARE = 'share',
    IGNORE = 'ignore',
    VERIFY = 'verify',
}

@Entity('telemetry_decision_outcome')
export class DecisionOutcome {
    @PrimaryColumn()
    session_id: string;

    @Column({ type: 'enum', enum: DecisionType })
    player_decision_type: DecisionType;

    @Column({ type: 'int', default: 0 })
    decision_confidence_level: number; // 1 (very low) – 5 (very high)

    @Column({ default: false })
    decision_changed: boolean; // True if player changed decision before final submit

    @Column({ type: 'int', default: 0 })
    decision_change_count: number; // Number of times decision was modified

    @CreateDateColumn()
    recorded_at: Date;
}
