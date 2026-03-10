import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('telemetry_content_consumption')
export class ContentConsumption {
    @PrimaryColumn()
    session_id: string;

    @Column({ type: 'int', default: 0 })
    scroll_depth_percent: number; // 0–100

    @Column({ type: 'int', default: 0 })
    text_dwell_time_ms: number;

    @Column({ type: 'int', default: 0 })
    paragraphs_viewed: number;

    @Column({ type: 'int', default: 0 })
    back_scroll_count: number;

    @CreateDateColumn()
    recorded_at: Date;
}
