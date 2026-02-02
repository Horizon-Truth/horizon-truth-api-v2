import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { UserStatus } from '../../shared/enums/user-status.enum';
import { UserRole } from '../../shared/enums/user-role.enum';
import { PlayerProfile } from '../../players/entities/player-profile.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, nullable: true })
    email?: string;

    @Column({ unique: true, nullable: true })
    username?: string;

    @Column({ unique: true, nullable: true })
    phone?: string;

    @Column({ name: 'api_key', unique: true, nullable: true })
    apiKey?: string;

    @Column({ name: 'password_hash', select: false, type: 'text', nullable: true })
    passwordHash: string;

    @Column({ name: 'full_name' })
    fullName: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.PLAYER,
    })
    role: UserRole;

    @Column({
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.ACTIVE
    })
    status: UserStatus;

    @Column({ name: 'is_verified', type: 'boolean', default: false })
    isVerified: boolean;

    @Column({ name: 'preferred_language', type: 'varchar', default: 'en' })
    preferredLanguage: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;

    @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
    lastLoginAt?: Date;

    @OneToOne(() => PlayerProfile, (profile) => profile.user)
    playerProfile: PlayerProfile;
}