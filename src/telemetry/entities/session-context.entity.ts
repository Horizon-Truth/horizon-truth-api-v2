import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

export enum DeviceType {
    MOBILE = 'mobile',
    TABLET = 'tablet',
    DESKTOP = 'desktop',
}
