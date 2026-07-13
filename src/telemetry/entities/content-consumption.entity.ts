import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('telemetry_content_consumption')
export class ContentConsumption {
    @PrimaryColumn()