import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('regions')
export class Region {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Silicon Delta' })
  @Column({ unique: true })
  name: string;

  @ApiProperty({ example: 'A bustling hub of technology and innovation.' })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ default: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
