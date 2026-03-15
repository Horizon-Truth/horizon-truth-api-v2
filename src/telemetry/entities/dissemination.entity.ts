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