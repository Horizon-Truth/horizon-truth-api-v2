import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity('user_activities')
export class UserActivity {
    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ApiProperty({ example: 'LOGIN', description: 'Type of activity' })
    @Column({ type: 'varchar', length: 100 })
    action: string;

    @ApiPropertyOptional({ description: 'Additional metadata about the activity' })
    @Column({ type: 'jsonb', nullable: true })
    metadata?: Record<string, any>;

    @ApiPropertyOptional({ example: 'a3f5b2c9...', description: 'Hashed IP for privacy' })
    @Column({ name: 'ip_address_hash', type: 'varchar', length: 64, nullable: true })
    ipAddressHash?: string;

    @ApiPropertyOptional({ example: '192.168.*.*', description: 'Partial IP for geolocation' })
    @Column({ name: 'ip_address_partial', type: 'varchar', length: 45, nullable: true })
    ipAddressPartial?: string;

    @ApiPropertyOptional({ example: 'Mozilla/5.0...' })
    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent?: string;

    @ApiProperty()
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
