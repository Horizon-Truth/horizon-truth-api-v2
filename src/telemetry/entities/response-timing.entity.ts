import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('telemetry_response_timing')
export class ResponseTiming {
    @PrimaryColumn()
    session_id: string;

    @Column({ type: 'timestamp' })
    content_shown_timestamp: Date;

    @Column({ type: 'timestamp', nullable: true })
    first_action_timestamp: Date;

    @Column({ type: 'timestamp', nullable: true })
    final_decision_timestamp: Date;

    @Column({ type: 'int', default: 0 })
    time_to_first_action_ms: number;

    @Column({ type: 'int', default: 0 })
    time_to_final_decision_ms: number;

    @CreateDateColumn()
    recorded_at: Date;
}
