import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('telemetry_response_timing')
export class ResponseTiming {
    @PrimaryColumn()
    session_id: string;

    @Column({ type: 'timestamp' })