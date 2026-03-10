import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

export enum SocialContextExposureType {
    NONE = 'none',
    PEER = 'peer',
    AUTHORITY = 'authority',
    FAMOUS = 'famous',
}

@Entity('telemetry_social_context_exposure')
export class SocialContextExposure {
    @PrimaryColumn()
    session_id: string;

    @Column({ type: 'enum', enum: SocialContextExposureType, default: SocialContextExposureType.NONE })
    social_context_exposed: SocialContextExposureType;

    @Column({ default: false })
    social_metrics_visible: boolean;

    @Column({ type: 'int', default: 0 })
    like_count_shown: number;

    @Column({ type: 'int', default: 0 })
    share_count_shown: number;

    @Column({ type: 'int', default: 0 })
    comment_count_shown: number;

    @Column({ nullable: true })
    highlighted_comment_type: string;

    @Column({ default: false })
    authority_badge_visible: boolean;

    @CreateDateColumn()
    recorded_at: Date;
}
