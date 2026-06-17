import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

export enum DeviceType {
    MOBILE = 'mobile',
    TABLET = 'tablet',
    DESKTOP = 'desktop',
}

export enum NetworkState {
    OFFLINE = 'offline',
    POOR = 'poor',
    GOOD = 'good',
}

@Entity('telemetry_session_context')
export class SessionContext {
    @PrimaryColumn()
    session_id: string; // Unique identifier for the play session

    @Column()
    player_id: string; // Anonymous player identifier

    @Column()
    level_id: string; // Game level or scenario identifier

    @Column()
    content_id: string; // Unique ID of the content shown

    @Column({ type: 'enum', enum: DeviceType })
    device_type: DeviceType;

    @Column({ type: 'enum', enum: NetworkState })
    network_state: NetworkState;

    @CreateDateColumn()
    recorded_at: Date;
}
