import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

export enum ShareChannelType {
    PUBLIC = 'public',
    PRIVATE = 'private',
    GROUP = 'group',
}
