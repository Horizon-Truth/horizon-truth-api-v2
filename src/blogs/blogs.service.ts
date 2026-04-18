import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blog } from './entities/blog.entity';
import { CreateBlogDto, UpdateBlogDto } from './dto/blog.dto';
import { ContentLanguage } from '../shared/enums/content-language.enum';

export interface BlogQueryOptions {