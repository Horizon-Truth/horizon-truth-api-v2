import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ModerationFlagType,
  ModerationFlagSeverity,
} from '../../shared/enums/moderation-flag-type.enum';
import { ModerationFlagAssignment } from './moderation-flag-assignment.entity';

/**
 * The flag catalogue. One row per available flag; administrators can retune
 * the label, colour, icon, description and severity without a deploy.
 *
 * `code` is the stable analytics key. Several rows may share
 * `ModerationFlagType.CUSTOM`, which is why `code` — not `type` — is unique.
 */
@Entity('moderation_flags')
export class ModerationFlag {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'HATE_SPEECH' })
  @Column({ type: 'varchar', unique: true })
  code: string;

  @ApiProperty({ enum: ModerationFlagType })
  @Column({
    type: 'enum',
    enum: ModerationFlagType,
    default: ModerationFlagType.CUSTOM,
  })
  type: ModerationFlagType;

  @ApiProperty({ example: 'Hate Speech' })
  @Column()
  label: string;

  @ApiProperty({
    example: 'Attacks a person or group on the basis of a protected attribute.',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ enum: ModerationFlagSeverity })
  @Column({
    type: 'enum',
    enum: ModerationFlagSeverity,
    default: ModerationFlagSeverity.MEDIUM,
  })
  severity: ModerationFlagSeverity;

  @ApiProperty({
    example: 'rose',
    description:
      'Semantic colour token resolved by the client to theme-aware classes.',
  })
  @Column({ type: 'varchar', default: 'slate' })
  color: string;

  @ApiProperty({
    example: 'ShieldAlert',
    description: 'lucide-react icon name.',
  })
  @Column({ type: 'varchar', default: 'Flag' })
  icon: string;

  @ApiProperty({
    default: false,
    description: 'System flags cannot be deleted, only deactivated.',
  })
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @ApiProperty({ default: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ default: 0, description: 'Display order in flag pickers.' })
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ApiPropertyOptional({
    description:
      'Localised labels/descriptions keyed by language code, e.g. { am: { label: … } }.',
  })
  @Column({ type: 'jsonb', nullable: true })
  translations?: Record<
    string,
    { label?: string; description?: string }
  > | null;

  @OneToMany(() => ModerationFlagAssignment, (a) => a.flag)
  assignments: ModerationFlagAssignment[];

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
