import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('telemetry_verification')
export class VerificationAction {
    @PrimaryColumn()
    session_id: string;

    @Column({ type: 'int', default: 0 })
    source_button_clicked_count: number;

    @Column({ default: false })
    learn_more_opened: boolean;

    @Column({ type: 'int', default: 0 })
    fact_panel_views: number;

    @Column({ default: false })
    external_link_clicked: boolean;

    @Column({ default: false })
    profile_checked: boolean;

    @Column({ type: 'timestamp', nullable: true })
    verification_start_timestamp: Date;

    @Column({ type: 'timestamp', nullable: true })
    verification_end_timestamp: Date;

    @Column({ type: 'int', default: 0 })
    verification_time_ms: number;

    @Column({ type: 'int', default: 0 })
    verification_sequence_length: number;

    @CreateDateColumn()
    recorded_at: Date;
}
