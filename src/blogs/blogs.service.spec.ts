import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BlogsService } from './blogs.service';
import { Blog } from './entities/blog.entity';
import { ContentLanguage } from '../shared/enums/content-language.enum';

describe('BlogsService (language filtering)', () => {
  let service: BlogsService;
  let qb: any;
  let repo: any;

  beforeEach(async () => {
    qb = {
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),