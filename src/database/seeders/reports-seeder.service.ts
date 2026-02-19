import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportTag } from '../../reports/entities/report-tag.entity';
import { Language } from '../../reports/entities/language.entity';

@Injectable()
export class ReportsSeederService {
  private readonly logger = new Logger(ReportsSeederService.name);

  constructor(
    @InjectRepository(ReportTag)
    private reportTagRepository: Repository<ReportTag>,
    @InjectRepository(Language)
    private languageRepository: Repository<Language>,
  ) {}

  async seed() {
    this.logger.log('Starting reports data seeding...');

    await this.seedReportTags();
    await this.seedLanguages();

    this.logger.log('Reports data seeding completed!');
  }

  private async seedLanguages() {
    this.logger.log('Seeding languages...');

    const languages = [
      { name: 'English', code: 'en' },
      { name: 'Amharic', code: 'am' },
      { name: 'Afan Oromo', code: 'or' },
    ];

    for (const lang of languages) {
      const existing = await this.languageRepository.findOne({
        where: { code: lang.code },
      });

      if (!existing) {
        const newLang = this.languageRepository.create({
          ...lang,
          isActive: true,
        });
        await this.languageRepository.save(newLang);
        this.logger.log(`Created language: ${lang.name}`);
      }
    }
  }

  private async seedReportTags() {
    this.logger.log('Seeding report tags...');

    const tags = [
      {
        name: 'Disinformation',
        slug: 'disinformation',
        description: 'Intentional spread of false information',
      },
      {
        name: 'Hate Speech',
        slug: 'hate-speech',
        description: 'Content that attacks people based on attributes',
      },
      {
        name: 'Deepfake',
        slug: 'deepfake',
        description: 'AI-generated manipulated media',
      },
      {
        name: 'Propaganda',
        slug: 'propaganda',
        description: 'Biased or misleading information used to promote a cause',
      },
      {
        name: 'Incitement',
        slug: 'incitement',
        description: 'Content encouraging illegal acts or violence',
      },
      {
        name: 'Scam',
        slug: 'scam',
        description: 'Deceptive content intended to defraud',
      },
    ];

    for (const tag of tags) {
      const existing = await this.reportTagRepository.findOne({
        where: { slug: tag.slug },
      });

      if (!existing) {
        const newTag = this.reportTagRepository.create({
          ...tag,
          isActive: true,
        });
        await this.reportTagRepository.save(newTag);
        this.logger.log(`Created tag: ${tag.name}`);
      }
    }
  }
}
