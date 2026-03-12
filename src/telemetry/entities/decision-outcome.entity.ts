import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

export enum DecisionType {
    TRUST = 'trust',
    DISTRUST = 'distrust',
    SHARE = 'share',