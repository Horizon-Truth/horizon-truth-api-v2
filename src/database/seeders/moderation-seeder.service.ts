import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';

import { ModerationFlag } from '../../moderation/entities/moderation-flag.entity';
import { ModerationFlagAssignment } from '../../moderation/entities/moderation-flag-assignment.entity';
import { IncidentReport } from '../../incidents/entities/incident-report.entity';
import { IncidentStatus } from '../../incidents/entities/incident-status.entity';
import { ModerationAction } from '../../incidents/entities/moderation-action.entity';
import { User } from '../../users/entities/user.entity';

import {
  ModerationFlagSeverity,
  ModerationFlagType,
} from '../../shared/enums/moderation-flag-type.enum';
import { ModerationCaseStatus } from '../../shared/enums/moderation-case-status.enum';
import { ModerationTargetType } from '../../shared/enums/moderation-target-type.enum';
import { IncidentReportReason } from '../../shared/enums/incident-report-reason.enum';
import { IncidentSeverity } from '../../shared/enums/incident-severity.enum';
import { ModerationActionType } from '../../shared/enums/moderation-action-type.enum';
import { UserRole } from '../../shared/enums/user-role.enum';

/**
 * The sixteen flags of the standard catalogue.
 *
 * Marked `isSystem` so an administrator can retire but never delete them —
 * historical decisions reference these codes and analytics compare across
 * them over time. Amharic and Afaan Oromo labels ship with the seed so the
 * moderation UI is multilingual from first run.
 */
const SYSTEM_FLAGS: Array<
  Omit<Partial<ModerationFlag>, 'id'> & { code: string }
> = [
  {
    code: 'SPAM',
    type: ModerationFlagType.SPAM,
    label: 'Spam',
    description:
      'Unsolicited repetitive posting, mass-mentions, or promotional flooding.',
    severity: ModerationFlagSeverity.LOW,
    color: 'amber',
    icon: 'Mail',
    sortOrder: 10,
    translations: {
      am: { label: 'አይፈለጌ መልእክት' },
      om: { label: 'Ergaa Hin Barbaachifne' },
    },
  },
  {
    code: 'MISINFORMATION',
    type: ModerationFlagType.MISINFORMATION,
    label: 'Misinformation',
    description:
      'Inaccurate claim shared without intent to deceive. Prefer a correction ' +
      'or fact-check label over removal.',
    severity: ModerationFlagSeverity.MEDIUM,
    color: 'orange',
    icon: 'AlertCircle',
    sortOrder: 20,
    translations: {
      am: { label: 'የተሳሳተ መረጃ' },
      om: { label: 'Odeeffannoo Dogoggoraa' },
    },
  },
  {
    code: 'HARASSMENT',
    type: ModerationFlagType.HARASSMENT,
    label: 'Harassment',
    description:
      'Targeted abuse, intimidation or repeated unwanted contact aimed at an ' +
      'individual.',
    severity: ModerationFlagSeverity.HIGH,
    color: 'rose',
    icon: 'UserX',
    sortOrder: 30,
    translations: {
      am: { label: 'ትንኮሳ' },
      om: { label: 'Rakkisuu' },
    },
  },
  {
    code: 'HATE_SPEECH',
    type: ModerationFlagType.HATE_SPEECH,
    label: 'Hate Speech',
    description:
      'Attacks a person or group on the basis of ethnicity, religion, gender, ' +
      'disability or another protected attribute. Remove on sight.',
    severity: ModerationFlagSeverity.CRITICAL,
    color: 'red',
    icon: 'ShieldAlert',
    sortOrder: 40,
    translations: {
      am: { label: 'የጥላቻ ንግግር' },
      om: { label: 'Haasaa Jibbaa' },
    },
  },
  {
    code: 'VIOLENCE',
    type: ModerationFlagType.VIOLENCE,
    label: 'Violence',
    description:
      'Threatens, incites or glorifies violence against people or property.',
    severity: ModerationFlagSeverity.CRITICAL,
    color: 'red',
    icon: 'Swords',
    sortOrder: 50,
    translations: {
      am: { label: 'ጥቃት' },
      om: { label: 'Goolii' },
    },
  },
  {
    code: 'GRAPHIC_CONTENT',
    type: ModerationFlagType.GRAPHIC_CONTENT,
    label: 'Graphic Content',
    description:
      'Gore, injury or other distressing imagery. May be permitted behind an ' +
      'interstitial when it has clear educational value.',
    severity: ModerationFlagSeverity.HIGH,
    color: 'red',
    icon: 'EyeOff',
    sortOrder: 60,
    translations: {
      am: { label: 'አስከፊ ይዘት' },
      om: { label: 'Qabiyyee Suukanneessaa' },
    },
  },
  {
    code: 'FALSE_INFORMATION',
    type: ModerationFlagType.FALSE_INFORMATION,
    label: 'False Information',
    description:
      'Demonstrably false claim spread deliberately. Distinguished from ' +
      'MISINFORMATION by intent.',
    severity: ModerationFlagSeverity.HIGH,
    color: 'orange',
    icon: 'XCircle',
    sortOrder: 70,
    translations: {
      am: { label: 'ሐሰተኛ መረጃ' },
      om: { label: 'Odeeffannoo Sobaa' },
    },
  },
  {
    code: 'IMPERSONATION',
    type: ModerationFlagType.IMPERSONATION,
    label: 'Impersonation',
    description: 'Poses as another person, organisation or official body.',
    severity: ModerationFlagSeverity.HIGH,
    color: 'purple',
    icon: 'UserRoundX',
    sortOrder: 80,
    translations: {
      am: { label: 'ማንነት መስረቅ' },
      om: { label: 'Eenyummaa Hatuu' },
    },
  },
  {
    code: 'COPYRIGHT',
    type: ModerationFlagType.COPYRIGHT,
    label: 'Copyright',
    description: 'Reproduces protected work without permission or attribution.',
    severity: ModerationFlagSeverity.MEDIUM,
    color: 'blue',
    icon: 'Copyright',
    sortOrder: 90,
    translations: {
      am: { label: 'የቅጂ መብት' },
      om: { label: 'Mirga Garagalchaa' },
    },
  },
  {
    code: 'UNSAFE_EXTERNAL_LINK',
    type: ModerationFlagType.UNSAFE_EXTERNAL_LINK,
    label: 'Unsafe External Link',
    description:
      'Links to malware, phishing or a credential-harvesting page. Hide ' +
      'immediately, then escalate.',
    severity: ModerationFlagSeverity.CRITICAL,
    color: 'red',
    icon: 'LinkOff',
    sortOrder: 100,
    translations: {
      am: { label: 'አደገኛ አገናኝ' },
      om: { label: 'Hidhaa Balaafamaa' },
    },
  },
  {
    code: 'LOW_QUALITY',
    type: ModerationFlagType.LOW_QUALITY,
    label: 'Low Quality',
    description:
      'Adds little value: unclear, off-topic or largely incoherent. Rarely ' +
      'grounds for removal on its own.',
    severity: ModerationFlagSeverity.LOW,
    color: 'slate',
    icon: 'FileWarning',
    sortOrder: 110,
    translations: {
      am: { label: 'ዝቅተኛ ጥራት' },
      om: { label: 'Qulqullina Gadi Aanaa' },
    },
  },
  {
    code: 'DUPLICATE',
    type: ModerationFlagType.DUPLICATE,
    label: 'Duplicate',
    description: 'Already reported or already published elsewhere.',
    severity: ModerationFlagSeverity.INFO,
    color: 'slate',
    icon: 'Copy',
    sortOrder: 120,
    translations: {
      am: { label: 'ተደጋጋሚ' },
      om: { label: 'Irra Deebi’ame' },
    },
  },
  {
    code: 'NEEDS_FACT_CHECK',
    type: ModerationFlagType.NEEDS_FACT_CHECK,
    label: 'Needs Fact Check',
    description:
      'Claim is plausible but unverified. Route to the fact-checking queue ' +
      'rather than deciding it in moderation.',
    severity: ModerationFlagSeverity.INFO,
    color: 'cyan',
    icon: 'Search',
    sortOrder: 130,
    translations: {
      am: { label: 'እውነታ ማረጋገጫ ይፈልጋል' },
      om: { label: 'Mirkaneeffannoo Barbaada' },
    },
  },
  {
    code: 'UNDER_REVIEW',
    type: ModerationFlagType.UNDER_REVIEW,
    label: 'Under Review',
    description: 'Working marker: a moderator is actively assessing this item.',
    severity: ModerationFlagSeverity.INFO,
    color: 'indigo',
    icon: 'Clock',
    sortOrder: 140,
    translations: {
      am: { label: 'በግምገማ ላይ' },
      om: { label: 'Qorannoo Jala' },
    },
  },
  {
    code: 'EDUCATIONAL_CONCERN',
    type: ModerationFlagType.EDUCATIONAL_CONCERN,
    label: 'Educational Concern',
    description:
      'Pedagogically misleading: teaches a flawed verification habit, or ' +
      'models the very behaviour the scenario warns against.',
    severity: ModerationFlagSeverity.MEDIUM,
    color: 'emerald',
    icon: 'GraduationCap',
    sortOrder: 150,
    translations: {
      am: { label: 'የትምህርት ስጋት' },
      om: { label: 'Yaaddoo Barnootaa' },
    },
  },
  {
    code: 'CUSTOM_REVIEW_REQUIRED',
    type: ModerationFlagType.CUSTOM,
    label: 'Custom Review Required',
    description:
      'Template for organisation-specific policy flags. Duplicate and rename ' +
      'this to add your own.',
    severity: ModerationFlagSeverity.MEDIUM,
    color: 'violet',
    icon: 'Flag',
    sortOrder: 160,
  },
];

/**
 * Demo cases covering the states a trainee moderator has to recognise: an
 * unassigned critical report, an in-review case, an escalation, a resolved
 * case and a dismissal.
 */
const DEMO_CASES: Array<{
  reason: IncidentReportReason;
  severity: IncidentSeverity;
  status: ModerationCaseStatus;
  targetType: ModerationTargetType;
  description: string;
  preview: string;
  flags: string[];
  anonymous?: boolean;
  ageHours: number;
}> = [
  {
    reason: IncidentReportReason.HATE_SPEECH,
    severity: IncidentSeverity.CRITICAL,
    status: ModerationCaseStatus.OPEN,
    targetType: ModerationTargetType.COMMENT,
    description:
      'A comment on the election-rumour scenario attacks a specific ethnic ' +
      'group and calls them liars who should be driven out.',
    preview:
      'They are all liars, every last one of them, and they should be driven out of the region before the vote.',
    flags: ['HATE_SPEECH'],
    anonymous: true,
    ageHours: 2,
  },
  {
    reason: IncidentReportReason.FALSE_INFO,
    severity: IncidentSeverity.HIGH,
    status: ModerationCaseStatus.UNDER_REVIEW,
    targetType: ModerationTargetType.CAPTURED_CONTENT,
    description:
      'A user-submitted screenshot claims a health ministry announced a ' +
      'nationwide curfew. No such announcement exists on the official channel.',
    preview:
      'BREAKING: Ministry confirms nationwide curfew starting midnight. Share before they take it down!',
    flags: ['FALSE_INFORMATION', 'NEEDS_FACT_CHECK'],
    ageHours: 20,
  },
  {
    reason: IncidentReportReason.UNSAFE_LINK,
    severity: IncidentSeverity.CRITICAL,
    status: ModerationCaseStatus.ESCALATED,
    targetType: ModerationTargetType.EXTERNAL_LINK,
    description:
      'Link posted in a discussion resolves to a credential-harvesting page ' +
      'imitating the Horizon Truth sign-in screen.',
    preview:
      'Verify your account here to keep your streak: horizon-truth-verify.example',
    flags: ['UNSAFE_EXTERNAL_LINK', 'IMPERSONATION'],
    ageHours: 6,
  },
  {
    reason: IncidentReportReason.SPAM,
    severity: IncidentSeverity.LOW,
    status: ModerationCaseStatus.RESOLVED,
    targetType: ModerationTargetType.COMMENT,
    description:
      'The same promotional message was posted across eleven scenario ' +
      'discussions within four minutes.',
    preview:
      'Earn 5000 birr a day working from home — message me for details!!',
    flags: ['SPAM'],
    ageHours: 72,
  },
  {
    reason: IncidentReportReason.LOW_QUALITY,
    severity: IncidentSeverity.LOW,
    status: ModerationCaseStatus.DISMISSED,
    targetType: ModerationTargetType.COMMENT,
    description:
      'Reported as spam, but on review it is a genuine question from a new ' +
      'learner that happens to be poorly worded.',
    preview:
      'sory i dont understand what the trust meter mean can somone explain',
    flags: [],
    ageHours: 96,
  },
  {
    reason: IncidentReportReason.EDUCATIONAL_CONCERN,
    severity: IncidentSeverity.MEDIUM,
    status: ModerationCaseStatus.ASSIGNED,
    targetType: ModerationTargetType.SCENARIO,
    description:
      'A community-authored scenario rewards sharing before verifying, which ' +
      'teaches the opposite of the intended habit.',
    preview:
      'Scenario: "Fast Reactions" — full marks are awarded for resharing within 10 seconds.',
    flags: ['EDUCATIONAL_CONCERN'],
    ageHours: 40,
  },
];

/**
 * Seeds the flag catalogue (always) and a small demo queue (only into an
 * empty moderation table, so it never contaminates a live deployment).
 */
@Injectable()
export class ModerationSeederService {
  private readonly logger = new Logger(ModerationSeederService.name);

  constructor(
    @InjectRepository(ModerationFlag)
    private readonly flagRepo: Repository<ModerationFlag>,
    @InjectRepository(ModerationFlagAssignment)
    private readonly assignmentRepo: Repository<ModerationFlagAssignment>,
    @InjectRepository(IncidentReport)
    private readonly caseRepo: Repository<IncidentReport>,
    @InjectRepository(IncidentStatus)
    private readonly statusRepo: Repository<IncidentStatus>,
    @InjectRepository(ModerationAction)
    private readonly actionRepo: Repository<ModerationAction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    await this.seedFlagCatalogue();
    await this.seedDemoCases();
  }

  /**
   * Idempotent: new flags are inserted, existing ones left alone so an
   * administrator's retuned label or colour survives a re-seed.
   */
  private async seedFlagCatalogue(): Promise<void> {
    const existing = await this.flagRepo.find({ select: ['code'] });
    const known = new Set(existing.map((f) => f.code));

    const missing = SYSTEM_FLAGS.filter((f) => !known.has(f.code));

    if (missing.length === 0) {
      this.logger.log(
        `Flag catalogue already complete (${known.size} flags), skipping.`,
      );
      return;
    }

    await this.flagRepo.save(
      missing.map((f) =>
        this.flagRepo.create({
          ...f,
          isSystem: f.code !== 'CUSTOM_REVIEW_REQUIRED',
          isActive: true,
        }),
      ),
    );

    this.logger.log(`Seeded ${missing.length} moderation flag(s).`);
  }

  private async seedDemoCases(): Promise<void> {
    const existingCases = await this.caseRepo.count();
    if (existingCases > 0) {
      this.logger.log('Moderation cases already present, skipping demo seed.');
      return;
    }

    const [moderator, reporter, offender] = await Promise.all([
      this.userRepo.findOne({
        where: {
          role: In([
            UserRole.MODERATOR,
            UserRole.SENIOR_MODERATOR,
            UserRole.SYSTEM_ADMIN,
          ]),
        },
      }),
      this.userRepo.findOne({ where: { role: UserRole.PLAYER } }),
      this.userRepo.findOne({ where: { role: UserRole.PLAYER } }),
    ]);

    if (!moderator || !reporter) {
      this.logger.warn(
        'No moderator or player account found — skipping demo moderation ' +
          'cases. Run the system seeder first.',
      );
      return;
    }

    const flags = await this.flagRepo.find();
    const flagByCode = new Map(flags.map((f) => [f.code, f]));

    for (const demo of DEMO_CASES) {
      const createdAt = new Date(Date.now() - demo.ageHours * 3_600_000);
      const isTerminal = [
        ModerationCaseStatus.RESOLVED,
        ModerationCaseStatus.DISMISSED,
      ].includes(demo.status);

      const isOwned = demo.status !== ModerationCaseStatus.OPEN;

      const created = await this.caseRepo.save(
        this.caseRepo.create({
          caseNumber: `HT-${randomBytes(3).toString('hex').toUpperCase()}`,
          targetType: demo.targetType,
          targetId: null,
          targetPreview: demo.preview,
          reportedByUserId: reporter.id,
          reportedUserId: offender?.id ?? null,
          isAnonymous: demo.anonymous ?? false,
          reportReason: demo.reason,
          description: demo.description,
          severity: demo.severity,
          status: demo.status,
          assignedModeratorId: isOwned ? moderator.id : null,
          assignedAt: isOwned ? createdAt : null,
          firstReviewedAt: isOwned ? createdAt : null,
          createdAt,
          resolvedById: isTerminal ? moderator.id : null,
          resolvedAt: isTerminal ? new Date() : null,
          resolutionSeconds: isTerminal ? demo.ageHours * 3600 : null,
          resolutionNotes: isTerminal
            ? demo.status === ModerationCaseStatus.RESOLVED
              ? 'Violation confirmed; content removed and the author warned.'
              : 'No policy violation found. Reporter thanked and educated.'
            : null,
        }),
      );

      await this.statusRepo.save(
        this.statusRepo.create({
          incidentReportId: created.id,
          fromStatus: null,
          status: ModerationCaseStatus.OPEN,
          decidedByUserId: reporter.id,
          decisionReason: 'Report submitted',
          createdAt,
        }),
      );

      if (demo.status !== ModerationCaseStatus.OPEN) {
        await this.statusRepo.save(
          this.statusRepo.create({
            incidentReportId: created.id,
            fromStatus: ModerationCaseStatus.OPEN,
            status: demo.status,
            decidedByUserId: moderator.id,
            decisionReason: 'Demo data: moved by the seeder for training.',
          }),
        );
      }

      await this.actionRepo.save(
        this.actionRepo.create({
          incidentReportId: created.id,
          moderatorUserId: reporter.id,
          action: ModerationActionType.CREATED,
          notes: demo.description,
          createdAt,
        }),
      );

      for (const code of demo.flags) {
        const flag = flagByCode.get(code);
        if (!flag) continue;

        await this.assignmentRepo.save(
          this.assignmentRepo.create({
            flagId: flag.id,
            targetType: demo.targetType,
            targetId: created.id,
            incidentReportId: created.id,
            appliedById: moderator.id,
            reason: 'Demo data: applied by the seeder for training.',
          }),
        );
      }
    }

    this.logger.log(`Seeded ${DEMO_CASES.length} demo moderation case(s).`);
  }
}
