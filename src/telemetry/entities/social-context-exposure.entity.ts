import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

export enum SocialContextExposureType {
    NONE = 'none',
    PEER = 'peer',
    AUTHORITY = 'authority',
    FAMOUS = 'famous',
}