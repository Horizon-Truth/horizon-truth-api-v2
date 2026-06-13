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
      getMany: jest.fn().mockResolvedValue([]),
    };
    repo = {
      createQueryBuilder: jest.fn(() => qb),
      create: jest.fn((dto) => dto),
      save: jest.fn((blog) => Promise.resolve({ id: 'b1', ...blog })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogsService,
        { provide: getRepositoryToken(Blog), useValue: repo },
      ],
    }).compile();

    service = module.get<BlogsService>(BlogsService);
  });

  it('filters retrieval by the requested language', async () => {
    await service.findAll({ language: ContentLanguage.AMHARIC });
    expect(qb.andWhere).toHaveBeenCalledWith('blog.language = :language', {
      language: ContentLanguage.AMHARIC,
    });
  });

  it('does not constrain language when none requested (admin view)', async () => {
    await service.findAll({});
    const languageCalls = qb.andWhere.mock.calls.filter((c: any[]) =>
      String(c[0]).includes('language'),
    );
    expect(languageCalls).toHaveLength(0);
  });

  it('applies a search filter scoped within the language', async () => {
    await service.findAll({ language: ContentLanguage.ENGLISH, search: 'fake' });
    expect(qb.andWhere).toHaveBeenCalledWith('blog.language = :language', {
      language: ContentLanguage.ENGLISH,
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('ILIKE :search'),
      { search: '%fake%' },
    );
  });

  it('persists the language on creation', async () => {
    const created = await service.create({
      title: 'T',
      slug: 't',
      excerpt: 'e',
      content: 'c',
      authorName: 'a',
      authorRole: 'r',
      category: 'cat',
      readTime: '5 min',
      language: ContentLanguage.AFAAN_OROMO,
    } as any);
    expect(created.language).toBe(ContentLanguage.AFAAN_OROMO);
  });
});
