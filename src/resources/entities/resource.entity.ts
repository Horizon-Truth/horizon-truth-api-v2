import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import {
    ContentLanguage,
    DEFAULT_CONTENT_LANGUAGE,
} from '../../shared/enums/content-language.enum';

export enum ResourceType {
    GUIDE = 'guide',
    VIDEO = 'video',