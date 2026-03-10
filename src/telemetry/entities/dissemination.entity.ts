import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

export enum ShareChannelType {
    PUBLIC = 'public',
    PRIVATE = 'private',
    GROUP = 'group',
}

@Entity('telemetry_dissemination')
export class Dissemination {
    @PrimaryColumn()
    session_id: string;

    @Column({ default: false })
    share_clicked: boolean;

    @Column({ type: 'enum', enum: ShareChannelType, nullable: true })
    share_channel_type: ShareChannelType;

    @Column({ type: 'int', default: 0 })
    share_count: number;

    @Column({ type: 'int', default: 0 })
    forward_count: number;

    @Column({ default: false })
    share_with_context: boolean;

    @Column({ type: 'int', default: 0 })
    estimated_audience_size: number;

    @Column({ default: false })
    re_share_enabled: boolean;

    @CreateDateColumn()
    recorded_at: Date;
}
