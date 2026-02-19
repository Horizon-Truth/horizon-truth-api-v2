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
    });
    if (existing)
      throw new ConflictException(
        'Language with this name or code already exists',
      );

    const lang = this.languageRepository.create(createDto);
    return this.languageRepository.save(lang);
  }

  async update(id: string, updateDto: UpdateLanguageDto): Promise<Language> {
    const lang = await this.findById(id);

    if (updateDto.name || updateDto.code) {
      const existing = await this.languageRepository
        .createQueryBuilder('lang')
        .where('(lang.name = :name OR lang.code = :code) AND lang.id != :id', {
          name: updateDto.name || '',
          code: updateDto.code || '',
          id,
        })
        .getOne();

      if (existing)
        throw new ConflictException(
          'Language with this name or code already exists',
        );
    }

    Object.assign(lang, updateDto);
    return this.languageRepository.save(lang);
  }

  async delete(id: string): Promise<void> {
    const result = await this.languageRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('Language not found');
  }
}
