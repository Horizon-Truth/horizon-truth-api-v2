import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from './entities/language.entity';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

@Injectable()
export class LanguagesService {
  constructor(
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
  ) {}

  async findAll(query: any): Promise<any> {
    const { isActive, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.languageRepository.createQueryBuilder('lang');

    if (isActive !== undefined) {
      queryBuilder.andWhere('lang.isActive = :isActive', {
        isActive: isActive === 'true',
      });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('lang.name', 'ASC')
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<Language> {
    const lang = await this.languageRepository.findOne({ where: { id } });
    if (!lang) throw new NotFoundException('Language not found');
    return lang;
  }

  async create(createDto: CreateLanguageDto): Promise<Language> {
    const existing = await this.languageRepository.findOne({
      where: [{ name: createDto.name }, { code: createDto.code }],