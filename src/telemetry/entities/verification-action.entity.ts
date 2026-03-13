import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('telemetry_verification')
export class VerificationAction {
    @PrimaryColumn()
    session_id: string;

    @Column({ type: 'int', default: 0 })
    source_button_clicked_count: number;

    @Column({ default: false })
    learn_more_opened: boolean;