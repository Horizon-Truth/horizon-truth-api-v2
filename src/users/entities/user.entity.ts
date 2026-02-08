import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../shared/enums/user-status.enum';
import { UserRole } from '../../shared/enums/user-role.enum';
import { PlayerProfile } from '../../players/entities/player-profile.entity';

@Entity('users')
export class User {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiPropertyOptional({ example: 'user@example.com' })
    @Column({ unique: true, nullable: true })
    email?: string;

    @ApiPropertyOptional({ example: 'johndoe' })
    @Column({ unique: true, nullable: true })
    username?: string;

    @ApiPropertyOptional({ example: '+22' })
    @Column({ unique: true, nullable: true })
    phone?: string;

    @ApiPropertyOptional()
    @Column({ name: 'api_key', unique: true, nullable: true })
    apiKey?: string;

    @Column({ name: 'password_hash', select: false, type: 'text', nullable: true })
    passwordHash: string;

    @ApiProperty({ example: 'John Doe' })
    @Column({ name: 'full_name' })
    fullName: string;

    @ApiProperty({ enum: UserRole, default: UserRole.PLAYER })
    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.PLAYER,
    })
    role: UserRole;

    @ApiProperty({ enum: UserStatus, default: UserStatus.ACTIVE })
    @Column({
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.ACTIVE
    })
    status: UserStatus;

    @ApiProperty({ default: false })
    @Column({ name: 'is_verified', type: 'boolean', default: false })
    isVerified: boolean;

    @ApiProperty({ default: 'en' })
    @Column({ name: 'preferred_language', type: 'varchar', default: 'en' })
    preferredLanguage: string;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @ApiProperty()
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;

    @ApiPropertyOptional()
    @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
    lastLoginAt?: Date;

    @OneToOne(() => PlayerProfile, (profile) => profile.user)
    playerProfile: PlayerProfile;

    @Column({ name: 'hashed_refresh_token', type: 'varchar', nullable: true, select: false })
    hashedRefreshToken?: string | null;

    @Column({ name: 'reset_password_token', type: 'varchar', nullable: true, select: false })
    resetPasswordToken?: string | null;

    @Column({ name: 'reset_password_expires', type: 'timestamp', nullable: true, select: false })
    resetPasswordExpires?: Date | null;
}