import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ResourceType } from '../entities/resource.entity';
import { ContentLanguage } from '../../shared/enums/content-language.enum';

export class CreateResourceDto {