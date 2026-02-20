import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportTag } from '../../reports/entities/report-tag.entity';
import { Report } from '../../reports/entities/report.entity';
import { ReportVerification } from '../../reports/entities/report-verification.entity';
import { Language } from '../../reports/entities/language.entity';
import { User } from '../../users/entities/user.entity';
import { ReportStatus } from '../../shared/enums/report-status.enum';
import { ReportPriorityLevel } from '../../shared/enums/report-priority-level.enum';
import { ReportContentType } from '../../shared/enums/report-content-type.enum';

@Injectable()
export class ReportsSeederService {
  private readonly logger = new Logger(ReportsSeederService.name);

  constructor(
    @InjectRepository(ReportTag)
    private reportTagRepository: Repository<ReportTag>,
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectRepository(ReportVerification)
    private reportVerificationRepository: Repository<ReportVerification>,
    @InjectRepository(Language)
    private languageRepository: Repository<Language>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) { }

  async seed() {
    this.logger.log('Starting reports data seeding...');

    const tags = await this.seedReportTags();
    await this.seedLanguages();

    const admin = await this.userRepository.findOne({ where: {} }); // Get any user for reporting
    if (admin) {
      await this.seedReports(admin, tags);
    }

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

    const tagsMetadata = [
      { name: 'Health', slug: 'health', icon: 'ShieldCheck', color: '#10b981' },
      { name: 'Social Media', slug: 'social', icon: 'Megaphone', color: '#3b82f6' },
      { name: 'Finance', slug: 'finance', icon: 'Star', color: '#f59e0b' },
      { name: 'Other', slug: 'other', icon: 'Info', color: '#6b7280' },
      { name: 'False Information', slug: 'false_information', icon: 'AlertCircle', color: '#ef4444' },
      { name: 'Manipulated Media', slug: 'manipulated_media', icon: 'Video', color: '#8b5cf6' },
      { name: 'Misleading Content', slug: 'misleading_content', icon: 'FileText', color: '#f97316' },
      { name: 'Harmful Advice', slug: 'harmful_advice', icon: 'Flame', color: '#dc2626' },
    ];

    const seededTags: ReportTag[] = [];

    for (const tag of tagsMetadata) {
      let existing = await this.reportTagRepository.findOne({
        where: { slug: tag.slug },
      });

      if (!existing) {
        existing = this.reportTagRepository.create({
          ...tag,
          isActive: true,
        });
        await this.reportTagRepository.save(existing);
        this.logger.log(`Created tag: ${tag.name}`);
      } else {
        // Update icons/colors for existing tags
        existing.icon = tag.icon;
        existing.color = tag.color;
        await this.reportTagRepository.save(existing);
      }
      seededTags.push(existing);
    }
    return seededTags;
  }

  private async seedReports(admin: User, tags: ReportTag[]) {
    this.logger.log('Seeding reports and verifications...');

    const reportsData = [
      {
        title: 'Viral Health Cure Claim',
        description: 'A popular social media post claiming a miracle cure for respiratory illnesses without medical evidence.',
        contentType: ReportContentType.ARTICLE,
        status: ReportStatus.UNDER_REVIEW,
        priority: ReportPriorityLevel.HIGH,
        language: 'en',
        credibilityScore: 15,
        sourceUrl: 'https://health-fake-news.com/miracle-cure',
        tagSlugs: ['health', 'false_information'],
        verifications: [
          { status: 'FALSE', comment: 'This contradicts all peer-reviewed studies on the subject.', rating: 1 },
          { status: 'FAKE', comment: 'Post flagged as harmful by 150+ users.', rating: 1 },
        ]
      },
      {
        title: 'Manipulated Crypto News',
        description: 'Deepfake video of a CEO promoting a fraudulent investment scheme.',
        contentType: ReportContentType.VIDEO,
        status: ReportStatus.VERIFIED,
        priority: ReportPriorityLevel.CRITICAL,
        language: 'en',
        credibilityScore: 88,
        sourceUrl: 'https://crypto-news.com/deepfake-ceo',
        tagSlugs: ['finance', 'manipulated_media'],
        verifications: [
          { status: 'TRUE', comment: 'Confirmed deepfake by AI analysis tools.', rating: 5 },
          { status: 'VERIFIED', comment: 'Official company statement confirms this is fake.', rating: 5 },
        ]
      },
      {
        title: 'Unverified Local Election Rumor',
        description: "WhatsApp message circulating rumors about polling station changes in District B.",
        contentType: ReportContentType.POST,
        status: ReportStatus.NEW,
        priority: ReportPriorityLevel.MEDIUM,
        language: 'en',
        credibilityScore: 40,
        sourceUrl: 'whatsapp://share?text=polling-station-rumor',
        tagSlugs: ['social', 'misleading_content'],
        verifications: [
          { status: 'NEEDS_REVIEW', comment: 'Waiting for official confirmation from election board.', rating: 3 },
        ]
      }
    ];

    for (const data of reportsData) {
      const existing = await this.reportRepository.findOne({
        where: { title: data.title },
      });

      if (!existing) {
        const { tagSlugs, verifications, ...reportInfo } = data;
        const reportTags = tags.filter(t => tagSlugs.includes(t.slug));

        const report = this.reportRepository.create({
          ...reportInfo,
          reporter: admin,
          tags: reportTags,
        });

        const savedReport = await this.reportRepository.save(report);

        for (const v of verifications) {
          const verification = this.reportVerificationRepository.create({
            ...v,
            report: savedReport,
            user: admin,
          });
          await this.reportVerificationRepository.save(verification);
        }
        this.logger.log(`Created report: ${data.title} with ${verifications.length} verifications`);
      }
    }
  }
}
