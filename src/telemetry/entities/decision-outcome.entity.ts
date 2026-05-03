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
