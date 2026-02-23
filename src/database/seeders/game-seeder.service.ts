import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scenario } from '../../engine/entities/scenario.entity';
import { Scene } from '../../engine/entities/scene.entity';
import { SceneContent } from '../../engine/entities/scene-content.entity';
import { Avatar } from '../../players/entities/avatar.entity';
import { Region } from '../../players/entities/region.entity';
import { Badge } from '../../gamification/entities/badge.entity';
import { GameLevel } from '../../engine/entities/game-level.entity';
import { SceneContentType } from '../../shared/enums/scene-content-type.enum';
import { ScenarioType } from '../../shared/enums/scenario-type.enum';
import { PlayerChoice } from '../../engine/entities/player-choice.entity';
import { GameOutcome } from '../../engine/entities/game-outcome.entity';
import { PlayerActionType } from '../../shared/enums/player-action-type.enum';
import { OutcomeType } from '../../shared/enums/outcome-type.enum';
import { BadgeCategory } from '../../shared/enums/badge-category.enum';
import { AvatarGender } from '../../shared/enums/avatar-gender.enum';
import { AvatarAgeGroup } from '../../shared/enums/avatar-age-group.enum';
import { ScenarioDifficulty } from '../../shared/enums/scenario-difficulty.enum';

@Injectable()
export class GameSeederService {
  private readonly logger = new Logger(GameSeederService.name);

  constructor(
    @InjectRepository(Scenario)
    private scenarioRepository: Repository<Scenario>,
    @InjectRepository(Scene)
    private sceneRepository: Repository<Scene>,
    @InjectRepository(SceneContent)
    private sceneContentRepository: Repository<SceneContent>,
    @InjectRepository(Avatar)
    private avatarRepository: Repository<Avatar>,
    @InjectRepository(Region)
    private regionRepository: Repository<Region>,
    @InjectRepository(Badge)
    private badgeRepository: Repository<Badge>,
    @InjectRepository(GameLevel)
    private gameLevelRepository: Repository<GameLevel>,
    @InjectRepository(PlayerChoice)
    private playerChoiceRepository: Repository<PlayerChoice>,
    @InjectRepository(GameOutcome)
    private gameOutcomeRepository: Repository<GameOutcome>,
  ) { }

  async seed() {
    this.logger.log('Starting game data seeding...');

    await this.seedGameLevels();
    await this.seedAvatars();
    await this.seedRegions();
    await this.seedBadges();
    await this.seedScenarios();

    this.logger.log('Game data seeding completed!');
  }

  private async seedGameLevels() {
    this.logger.log('Seeding game levels...');

    const levels = [
      {
        levelNumber: 0,
        name: 'Trainee',
        description: 'Begin your journey into truth verification',
      },
      {
        levelNumber: 1,
        name: 'Novice',
        description: 'Just getting started with truth verification',
      },
      {
        levelNumber: 2,
        name: 'Apprentice',
        description: 'Building your fact-checking skills',
      },
      {
        levelNumber: 3,
        name: 'Investigator',
        description: 'Skilled at identifying misinformation',
      },
      { levelNumber: 4, name: 'Detective', description: 'Expert truth seeker' },
      { levelNumber: 5, name: 'Master', description: 'Elite fact-checker' },
    ];

    for (const levelData of levels) {
      const existing = await this.gameLevelRepository.findOne({
        where: { levelNumber: levelData.levelNumber },
      });

      if (!existing) {
        const level = this.gameLevelRepository.create(levelData);
        await this.gameLevelRepository.save(level);
        this.logger.log(`Created level: ${levelData.name}`);
      }
    }
  }

  private async seedAvatars() {
    this.logger.log('Seeding avatars...');

    const avatars = [
      {
        name: 'Truth Seeker',
        imageUrl: '/avatars/truth-seeker.png',
        gender: 'NEUTRAL' as any,
        ageGroup: 'ADULT' as any,
      },
      {
        name: 'Fact Checker',
        imageUrl: '/avatars/fact-checker.png',
        gender: 'FEMALE' as any,
        ageGroup: 'ADULT' as any,
      },
      {
        name: 'Media Analyst',
        imageUrl: '/avatars/media-analyst.png',
        gender: 'MALE' as any,
        ageGroup: 'ADULT' as any,
      },
      {
        name: 'Detective',
        imageUrl: '/avatars/detective.png',
        gender: 'NEUTRAL' as any,
        ageGroup: 'ADULT' as any,
      },
      {
        name: 'Skeptic',
        imageUrl: '/avatars/skeptic.png',
        gender: 'FEMALE' as any,
        ageGroup: 'YOUTH' as any,
      },
      {
        name: 'Digital Native',
        imageUrl: '/avatars/digital-native.png',
        gender: 'MALE' as any,
        ageGroup: 'YOUTH' as any,
      },
      {
        name: 'Data Scout',
        imageUrl: '/avatars/data-scout.png',
        gender: 'FEMALE' as any,
        ageGroup: 'YOUTH' as any,
      },
      {
        name: 'Truth Apprentice',
        imageUrl: '/avatars/truth-apprentice.png',
        gender: 'NEUTRAL' as any,
        ageGroup: 'YOUTH' as any,
      },
      {
        name: 'Fact Finder',
        imageUrl: '/avatars/fact-finder.png',
        gender: 'FEMALE' as any,
        ageGroup: 'YOUTH' as any,
      },
      {
        name: 'Guardian',
        imageUrl: '/avatars/guardian.png',
        gender: 'MALE' as any,
        ageGroup: 'ADULT' as any,
      },
    ];

    for (const avatarData of avatars) {
      const existing = await this.avatarRepository.findOne({
        where: { name: avatarData.name },
      });

      if (!existing) {
        const avatar = this.avatarRepository.create({
          ...avatarData,
          isActive: true,
        });
        await this.avatarRepository.save(avatar);
        this.logger.log(`Created avatar: ${avatarData.name}`);
      }
    }
  }

  private async seedRegions() {
    this.logger.log('Seeding fictional regions...');

    const regions = [
      {
        name: 'Luma City',
        description: 'A vibrant urban center where information flows fast and social media shapes daily life.',
      },
      {
        name: 'Beko Town',
        description: 'A close-knit community where word-of-mouth spreads like wildfire.',
      },
      {
        name: 'Adama Heights',
        description: 'A diverse suburban district with a strong youth activist culture.',
      },
      {
        name: 'Dire Springs',
        description: 'A rural region where limited internet access makes misinformation harder to verify.',
      },
      {
        name: 'Hawassa Bay',
        description: 'A lakeside town with a growing tech scene and active Telegram communities.',
      },
    ];

    for (const regionData of regions) {
      const existing = await this.regionRepository.findOne({
        where: { name: regionData.name },
      });

      if (!existing) {
        const region = this.regionRepository.create({
          ...regionData,
          isActive: true,
        });
        await this.regionRepository.save(region);
        this.logger.log(`Created region: ${regionData.name}`);
      }
    }
  }

  private async seedBadges() {
    this.logger.log('Seeding badges...');

    const badges = [
      {
        code: 'FIRST_GAME',
        name: 'First Steps',
        description: 'Completed your first scenario',
        iconUrl: '/badges/first-game.png',
        category: BadgeCategory.ACHIEVEMENT,
      },
      {
        code: 'FACT_FINDER',
        name: 'Fact Finder',
        description: 'Successfully identified misinformation 10 times',
        iconUrl: '/badges/fact-finder.png',
        category: BadgeCategory.ACHIEVEMENT,
      },
      {
        code: 'PERFECT_RUN',
        name: 'Perfect Run',
        description: 'Completed a scenario with a perfect score',
        iconUrl: '/badges/perfect-run.png',
        category: BadgeCategory.ACHIEVEMENT,
      },
      {
        code: 'STREAK_3',
        name: '3-Day Streak',
        description: 'Played for 3 consecutive days',
        iconUrl: '/badges/streak-3.png',
        category: BadgeCategory.PROGRESSION,
      },
      {
        code: 'TOP_10',
        name: 'Top 10',
        description: 'Ranked in the top 10 on the leaderboard',
        iconUrl: '/badges/top-10.png',
        category: BadgeCategory.COMPETITIVE,
      },
      {
        code: 'COMMUNITY_PROTECTOR',
        name: 'Community Protector',
        description: 'Identified a viral misinformation campaign early',
        iconUrl: '/badges/community-protector.png',
        category: BadgeCategory.ACHIEVEMENT,
      },
      {
        code: 'CRISIS_VERIFIER',
        name: 'Crisis Verifier',
        description: 'Successfully identified a high-stakes deepfake',
        iconUrl: '/badges/crisis-verifier.png',
        category: BadgeCategory.ACHIEVEMENT,
      },
    ];

    for (const badgeData of badges) {
      const existing = await this.badgeRepository.findOne({
        where: { code: badgeData.code },
      });

      if (!existing) {
        const badge = this.badgeRepository.create({
          ...badgeData,
          isActive: true,
        });
        await this.badgeRepository.save(badge);
        this.logger.log(`Created badge: ${badgeData.name}`);
      }
    }
  }

  private async seedScenarios() {
    this.logger.log('Seeding scenarios...');

    // ═══════════════════════════════════════════════════════════════
    // LEVEL 0 — PRIMING PHASE
    // Purpose: Establish player identity, emotional context, and
    //          baseline trust patterns before gameplay
    // Core Message: "Everything you do shapes what others see."
    // ═══════════════════════════════════════════════════════════════
    await this.createScenario({
      title: 'Priming Phase — Identity & Context',
      description:
        'Establish your digital identity and observe how social context shapes your perceptions before the real challenges begin.',
      levelNumber: 0,
      scenarioType: ScenarioType.CHAT_CONVERSATION,
      difficulty: ScenarioDifficulty.EASY,
      learningObjective:
        'Player realizes that their online actions shape the digital world around them.',
      theme: 'Digital Identity & Social Influence',
      preventionLesson:
        'Everything you do online shapes what others see. Your digital footprint starts before you even realize it.',
      scenes: [
        {
          order: 1,
          title: 'Friend List',
          description:
            '5 friends with mixed personalities appear. You feel a sense of belonging.',
          sceneType: 'INVESTIGATION',
          contentType: SceneContentType.CHAT,
          availableChoices: ['SELECT_FRIENDS', 'SKIP'],
          content: {
            textBody:
              'Welcome to Horizon! Here are 5 people who want to connect with you. Each has a different personality — some share news, some share memes, some are cautious. Who do you want in your circle?',
          },
          choices: [
            {
              label: 'SELECT_FRIENDS',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Group Chat',
            },
            {
              label: 'SKIP',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Group Chat',
            },
          ],
        },
        {
          order: 2,
          title: 'Group Chat',
          description:
            'A class group is discussing upcoming exams. You feel mild anxiety.',
          sceneType: 'INVESTIGATION',
          contentType: SceneContentType.CHAT,
          availableChoices: ['READ_MORE', 'SCROLL_PAST'],
          content: {
            textBody:
              '📱 Class Group Chat — "Grade 12 Warriors"\n\n@Marta: "Did anyone study for physics? I heard the exam is impossible this year 😰"\n@Dawit: "Relax, I found some notes online"\n@Selam: "Don\'t trust random links!"\n@Yonas: "Too late, already panicking lol"\n@Hana: "Let\'s just focus and help each other 💪"',
          },
          choices: [
            {
              label: 'READ_MORE',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Influencer Post',
            },
            {
              label: 'SCROLL_PAST',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Influencer Post',
            },
          ],
        },
        {
          order: 3,
          title: 'Influencer Post',
          description:
            'A popular youth influencer makes a bold claim. You feel authority bias.',
          sceneType: 'DECISION',
          contentType: SceneContentType.FEED,
          availableChoices: ['FOLLOW', 'VERIFY_CLAIM', 'IGNORE'],
          content: {
            textBody:
              '🌟 @TechBroETH (245K followers)\n"BREAKING: I just confirmed that the new education policy will cancel all exams for Grade 12 this year! Share this before they delete it! 🔥🔥"\n\n❤️ 12.3K  🔄 8.1K  💬 3.2K',
          },
          choices: [
            {
              label: 'FOLLOW',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: 0,
                outcomeType: OutcomeType.NEUTRAL,
                endScenario: true,
                message:
                  'Priming complete. Your algorithm profile has been initialized. Remember: everything you do shapes what others see. Now your real journey begins.',
              },
            },
            {
              label: 'VERIFY_CLAIM',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: 5,
                outcomeType: OutcomeType.PASS,
                endScenario: true,
                message:
                  'Excellent instinct! You questioned authority bias from the start. Your algorithm profile notes your critical thinking. Now your real journey begins.',
              },
            },
            {
              label: 'IGNORE',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: 0,
                outcomeType: OutcomeType.NEUTRAL,
                endScenario: true,
                message:
                  'Priming complete. Your algorithm profile has been initialized. You chose not to engage — but silence is also a choice. Now your real journey begins.',
              },
            },
          ],
        },
      ],
    });

    // ═══════════════════════════════════════════════════════════════
    // LEVEL 1, SCENARIO 1 — TELEGRAM EXAM LEAK
    // Theme: Academic Fraud / Social Media Manipulation
    // 3 full branches with deep consequences
    // ═══════════════════════════════════════════════════════════════
    await this.createScenario({
      title: 'The Exam Leak',
      description:
        'A Telegram post claims Grade 12 exam questions have been leaked. How you respond will shape whether misinformation spreads or stops.',
      levelNumber: 1,
      scenarioType: ScenarioType.SOCIAL_POST,
      difficulty: ScenarioDifficulty.EASY,
      learningObjective:
        'Understand how liking, ignoring, and verifying each have real consequences in the spread of misinformation.',
      psychologicalTrigger: 'Fear of missing out (FOMO) and exam anxiety',
      behavioralRisk: 'Reflexive engagement with unverified academic claims',
      preventionLesson:
        'Every interaction — even a Like — amplifies a message. Verification is the only responsible first step.',
      theme: 'Academic Fraud & Social Manipulation',
      scenes: [
        // ── ENTRY ──
        {
          order: 1,
          title: 'Telegram Post Appears',
          description:
            'A sensational post appears in your Telegram feed claiming leaked exam questions.',
          sceneType: 'INVESTIGATION',
          contentType: SceneContentType.FEED,
          availableChoices: ['LIKE', 'IGNORE', 'VERIFY'],
          content: {
            textBody:
              '🔥 Grade 12 Exam Questions Leaked — Only Today!\n\n📢 "A reliable source just sent me the full physics and math papers. This is 100% real. Like and share before it gets taken down!"\n\n❤️ 4.2K  🔄 2.8K  💬 1.1K',
          },
          choices: [
            {
              label: 'LIKE',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Notification Flood',
            },
            {
              label: 'IGNORE',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Continued Feed',
            },
            {
              label: 'VERIFY',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Fact Check Result',
            },
          ],
        },
        // ── BRANCH 1: LIKE PATH ──
        {
          order: 2,
          title: 'Notification Flood',
          description:
            'After liking, your notifications explode. Your friends are sharing the post.',
          sceneType: 'INVESTIGATION',
          contentType: SceneContentType.FEED,
          availableChoices: ['SHARE', 'VERIFY', 'IGNORE'],
          content: {
            textBody:
              '📱 Notification Flood:\n"Your friend Dawit shared this post"\n"Marta liked this post"\n"3 more friends are sharing this"\n\nThe post now has 15K likes. Your feed is filling with similar "leak" posts.',
          },
          choices: [
            {
              label: 'SHARE',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: -20,
                outcomeType: OutcomeType.FAIL,
                endScenario: true,
                message:
                  '📉 You helped this spread. The "leaked" questions were fake — designed to trick students into paying for a scam "answer key." 340 students lost money because people like you amplified it.',
              },
            },
            {
              label: 'VERIFY',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Fake Source Detected',
            },
            {
              label: 'IGNORE',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: -5,
                outcomeType: OutcomeType.PARTIAL_FAIL,
                endScenario: true,
                message:
                  '📉 Silence still spreads harm. You liked the post earlier — that Like boosted the algorithm. Even without sharing, your engagement helped it reach 5,000 more people.',
              },
            },
          ],
        },
        // ── BRANCH 1 CONT: VERIFY AFTER LIKE ──
        {
          order: 3,
          title: 'Fake Source Detected',
          description:
            'Your verification reveals the post is from a known scam network.',
          sceneType: 'ANALYSIS',
          contentType: SceneContentType.TEXT,
          availableChoices: ['REPORT', 'IGNORE_FINDING'],
          content: {
            textBody:
              '🔍 Verification Result:\n\n❌ The Telegram channel was created 2 days ago\n❌ The "leaked" document has no official watermarks\n❌ The Ministry of Education has made no such announcement\n❌ Similar scam detected in 3 other countries last month\n\nThis is a confirmed FAKE designed to sell a paid "answer key."',
          },
          choices: [
            {
              label: 'REPORT',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: 10,
                outcomeType: OutcomeType.PASS,
                endScenario: true,
                message:
                  '✅ You stopped the spread. Your report helped the platform remove the post before it reached 50,000 more students. Next time, verify BEFORE you like.',
              },
            },
            {
              label: 'IGNORE_FINDING',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: -5,
                outcomeType: OutcomeType.PARTIAL_FAIL,
                endScenario: true,
                message:
                  '📉 You found the truth but did nothing with it. Knowing but not acting still causes harm — the scam continued to spread.',
              },
            },
          ],
        },
        // ── BRANCH 2: IGNORE PATH ──
        {
          order: 4,
          title: 'Continued Feed',
          description:
            'You scrolled past, but the post keeps appearing. Your friends are still sharing it.',
          sceneType: 'INVESTIGATION',
          contentType: SceneContentType.FEED,
          availableChoices: ['VERIFY_NOW', 'CONTINUE_IGNORING'],
          content: {
            textBody:
              '📱 1 hour later...\n\nThe post has gone viral: 25K shares.\nYour friend Selam messaged you: "Is this real? Should we trust it?"\nYour class group is debating whether to buy the \"answer key.\"\n\n3 of your friends already paid 500 Birr each.',
          },
          choices: [
            {
              label: 'VERIFY_NOW',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Fake Source Detected After Ignore',
            },
            {
              label: 'CONTINUE_IGNORING',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: -10,
                outcomeType: OutcomeType.FAIL,
                endScenario: true,
                message:
                  '📉 Ignoring allows harm. While you stayed silent, 340 students paid for fake answers and the scam network grew. Inaction in the face of misinformation is complicity.',
              },
            },
          ],
        },
        // ── BRANCH 2 CONT: VERIFY AFTER IGNORE ──
        {
          order: 5,
          title: 'Fake Source Detected After Ignore',
          description:
            'Better late than never — your verification catches the scam.',
          sceneType: 'ANALYSIS',
          contentType: SceneContentType.TEXT,
          availableChoices: ['REPORT_IT', 'WALK_AWAY'],
          content: {
            textBody:
              '🔍 Verification Result:\n\n❌ Fake Telegram channel (created 2 days ago)\n❌ No official exam leak reported by any authority\n❌ The "answer key" payment link leads to a phishing site\n\nYour friend Selam is still waiting for your answer.',
          },
          choices: [
            {
              label: 'REPORT_IT',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: 15,
                outcomeType: OutcomeType.PASS,
                endScenario: true,
                message:
                  '✅ You protected your community. Your report helped remove the scam and you warned Selam in time. Acting late is better than never acting.',
              },
            },
            {
              label: 'WALK_AWAY',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: -10,
                outcomeType: OutcomeType.FAIL,
                endScenario: true,
                message:
                  '📉 You found the truth but walked away. Selam paid for the fake answers. Knowledge without action is wasted.',
              },
            },
          ],
        },
        // ── BRANCH 3: VERIFY PATH (BEST) ──
        {
          order: 6,
          title: 'Fact Check Result',
          description:
            'You chose to verify first — the smartest move. The source is clearly fake.',
          sceneType: 'ANALYSIS',
          contentType: SceneContentType.TEXT,
          availableChoices: ['REPORT_POST', 'IGNORE_RESULT'],
          content: {
            textBody:
              '🔍 Instant Fact Check:\n\n❌ This source is FALSE.\n❌ Channel created 48 hours ago with no history\n❌ Ministry of Education confirms: "No exam materials have been compromised"\n❌ The link leads to a payment scam targeting students\n\nYou caught it before anyone in your circle fell for it.',
          },
          choices: [
            {
              label: 'REPORT_POST',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: 20,
                outcomeType: OutcomeType.PERFECT_PASS,
                endScenario: true,
                message:
                  '🌟 Perfect response! You prevented the spread before it even started. Your report led to the channel being banned. You saved hundreds of students from a scam.',
              },
            },
            {
              label: 'IGNORE_RESULT',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: -5,
                outcomeType: OutcomeType.FAIL,
                endScenario: true,
                message:
                  '📉 Knowing but doing nothing still causes harm. You verified the fake but let it continue spreading to others. Truth has no value if you don\'t act on it.',
              },
            },
          ],
        },
      ],
    });

    // ═══════════════════════════════════════════════════════════════
    // LEVEL 1, SCENARIO 2 — FAKE X-BANK GIVEAWAY
    // Theme: Financial Phishing / Social Engineering
    // 3 full branches
    // ═══════════════════════════════════════════════════════════════
    await this.createScenario({
      title: 'X-Bank Giveaway Scam',
      description:
        'A Facebook post claims X-Bank is giving away 10,000 Birr to 500 lucky customers. Is it real or a phishing trap?',
      levelNumber: 1,
      scenarioType: ScenarioType.SOCIAL_POST,
      difficulty: ScenarioDifficulty.MEDIUM,
      learningObjective:
        'Recognize financial phishing tactics: fake domains, urgency, social proof from friends, and requests for sensitive data.',
      psychologicalTrigger: 'Greed and social proof (friends engaging)',
      behavioralRisk: 'Submitting personal financial data to unverified sources',
      preventionLesson:
        'Legitimate banks never ask for account numbers via social media. Always verify giveaways on the official bank website.',
      theme: 'Financial Phishing & Social Engineering',
      scenes: [
        // ── ENTRY ──
        {
          order: 1,
          title: 'Facebook Giveaway Post',
          description:
            'A professional-looking Facebook post announces a bank giveaway.',
          sceneType: 'INVESTIGATION',
          contentType: SceneContentType.FEED,
          availableChoices: ['LIKE', 'CLICK_LINK', 'VERIFY'],
          content: {
            textBody:
              '🏦 X-Bank Official Giveaway! 🎉\n\n"X-Bank is giving 10,000 Birr to 500 lucky customers! 💰\nClick here and submit your account number to qualify!\nOffer ends TODAY — don\'t miss out!"\n\n👍 8.7K  💬 2.1K  🔄 5.4K\n\n🔗 xbank-giveaway-official.com/claim',
          },
          choices: [
            {
              label: 'LIKE',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Friends Engaging',
            },
            {
              label: 'CLICK_LINK',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Phishing Page',
            },
            {
              label: 'VERIFY',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Bank Website Check',
            },
          ],
        },
        // ── BRANCH 1: LIKE PATH ──
        {
          order: 2,
          title: 'Friends Engaging',
          description:
            'After you liked the post, you see your friends are already engaging with it.',
          sceneType: 'INVESTIGATION',
          contentType: SceneContentType.FEED,
          availableChoices: ['CLICK_LINK_NOW', 'VERIFY_FIRST', 'SCROLL_PAST'],
          content: {
            textBody:
              '📱 Social Proof Alert:\n\n💬 Dawit: "I just applied! Fingers crossed 🤞"\n💬 Marta: "This is amazing, entering now!"\n💬 Yonas: "10,000 Birr?! Submitting my info right now!"\n\nThe post now shows 15K likes. Your Like helped boost it in the algorithm.',
          },
          choices: [
            {
              label: 'CLICK_LINK_NOW',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Fake Form Appears',
            },
            {
              label: 'VERIFY_FIRST',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Fake Domain Detected',
            },
            {
              label: 'SCROLL_PAST',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: -5,
                outcomeType: OutcomeType.PARTIAL_FAIL,
                endScenario: true,
                message:
                  '📉 You liked the post but scrolled past. Your Like still boosted the scam to 3,000 more people. Dawit lost 50,000 Birr from his account.',
              },
            },
          ],
        },
        // ── FAKE FORM (from Like→Click or direct Click) ──
        {
          order: 3,
          title: 'Fake Form Appears',
          description:
            'A form appears requesting your bank account number and phone number.',
          sceneType: 'DECISION',
          contentType: SceneContentType.TEXT,
          availableChoices: ['SUBMIT', 'VERIFY_FORM'],
          content: {
            textBody:
              '📋 X-Bank Customer Verification Form\n\n"To claim your 10,000 Birr prize, please enter:\n• Full Name\n• Bank Account Number\n• Phone Number\n• PIN (for verification purposes only)"\n\n⚠️ The URL bar shows: xbank-giveaway-official.com\n(Notice: NOT xbank.com.et — the real X-Bank domain)',
          },
          choices: [
            {
              label: 'SUBMIT',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: -25,
                outcomeType: OutcomeType.FAIL,
                endScenario: true,
                message:
                  '🚨 Your account was compromised. Within 30 minutes, 45,000 Birr was withdrawn from your account. The "giveaway" was a phishing operation that stole data from 2,000 people.',
              },
            },
            {
              label: 'VERIFY_FORM',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Fake Domain Detected',
            },
          ],
        },
        // ── FAKE DOMAIN DETECTED (shared by multiple paths) ──
        {
          order: 4,
          title: 'Fake Domain Detected',
          description:
            'Verification reveals the domain is fake — it\'s not the real X-Bank.',
          sceneType: 'ANALYSIS',
          contentType: SceneContentType.TEXT,
          availableChoices: ['REPORT_SCAM', 'IGNORE_WARNING'],
          content: {
            textBody:
              '🔍 Domain Analysis:\n\n❌ xbank-giveaway-official.com — FAKE DOMAIN\n✅ Real X-Bank website: xbank.com.et\n❌ The page logo is slightly blurred (copied, not official)\n❌ SSL certificate issued 24 hours ago (suspicious)\n❌ X-Bank official channels show NO giveaway announcements\n\nThis is a phishing site designed to steal account details.',
          },
          choices: [
            {
              label: 'REPORT_SCAM',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: 15,
                outcomeType: OutcomeType.PASS,
                endScenario: true,
                message:
                  '✅ You stopped a financial scam. Your report helped Facebook remove the post and warn 8,000 people who had already clicked. You protected your community\'s savings.',
              },
            },
            {
              label: 'IGNORE_WARNING',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: -10,
                outcomeType: OutcomeType.FAIL,
                endScenario: true,
                message:
                  '📉 Silence allows theft. You detected the scam but did nothing. 2,000 people submitted their bank details and collectively lost over 5 million Birr.',
              },
            },
          ],
        },
        // ── BRANCH 2: CLICK LINK PATH ──
        {
          order: 5,
          title: 'Phishing Page',
          description:
            'The link takes you to a page that looks almost like X-Bank — but something is off.',
          sceneType: 'INVESTIGATION',
          contentType: SceneContentType.TEXT,
          availableChoices: ['SUBMIT_INFO', 'CHECK_URL'],
          content: {
            textBody:
              '🌐 You landed on: xbank-giveaway-official.com/claim\n\nThe page looks professional, but:\n• The logo is slightly blurred\n• The URL is NOT xbank.com.et\n• There\'s a form asking for your account number and PIN\n• A countdown timer says: "Only 47 slots remaining!"\n\nEverything is designed to make you act fast.',
          },
          choices: [
            {
              label: 'SUBMIT_INFO',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: -25,
                outcomeType: OutcomeType.FAIL,
                endScenario: true,
                message:
                  '🚨 Your account was compromised. The countdown was fake — there were no "slots." Your banking credentials were stolen and sold within minutes.',
              },
            },
            {
              label: 'CHECK_URL',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Fake Domain Detected',
            },
          ],
        },
        // ── BRANCH 3: VERIFY PATH (BEST) ──
        {
          order: 6,
          title: 'Bank Website Check',
          description:
            'You go directly to X-Bank\'s official website to check for announcements.',
          sceneType: 'ANALYSIS',
          contentType: SceneContentType.TEXT,
          availableChoices: ['REPORT_FAKE', 'IGNORE_IT'],
          content: {
            textBody:
              '🔍 Official X-Bank Website (xbank.com.et):\n\n✅ "No active giveaway promotions at this time."\n✅ "Warning: We are aware of fraudulent posts on social media claiming to give away money. X-Bank will NEVER ask for your PIN or account number via social media."\n\n❌ The Facebook post is confirmed FAKE.',
          },
          choices: [
            {
              label: 'REPORT_FAKE',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: 20,
                outcomeType: OutcomeType.PERFECT_PASS,
                endScenario: true,
                message:
                  '🌟 You stopped a financial scam before falling for it. Your report helped protect thousands of potential victims. Always check the official source FIRST.',
              },
            },
            {
              label: 'IGNORE_IT',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: -5,
                outcomeType: OutcomeType.FAIL,
                endScenario: true,
                message:
                  '📉 Silence allows theft. You confirmed it was fake but didn\'t report it. The scam continued and 2,000 people lost their savings.',
              },
            },
          ],
        },
      ],
    });

    // ═══════════════════════════════════════════════════════════════
    // LEVEL 2 — THE MIDNIGHT WITNESS
    // Theme: Ethnic Polarization / Crisis Misinformation
    // Difficulty: Hard | Estimated Play Time: 8–10 minutes
    // 4 branches with complex consequence chains
    // ═══════════════════════════════════════════════════════════════
    await this.createScenario({
      title: 'The Midnight Witness',
      description:
        'It is 11:30 PM. A "Forwarded" message in your Telegram group shows a burning building. The caption claims an ethnic attack is underway. Your next action could save lives — or destroy them.',
      levelNumber: 2,
      scenarioType: ScenarioType.VIDEO_CLIP,
      difficulty: ScenarioDifficulty.HARD,
      learningObjective:
        'Demonstrate how emotional triggers and "witness" testimony bypass logic and fuel real-world conflict.',
      psychologicalTrigger:
        'Fear, tribal identity, adrenaline, and the urgency to protect loved ones',
      behavioralRisk:
        'Forwarding unverified crisis content that incites real-world violence',
      preventionLesson:
        'In a crisis, your anger is a weapon used by others. Check the date, beware the "Forwarded" tag, and follow the 5-Minute Rule: if a post makes you want to act violently, wait 5 minutes — real news will be on official channels.',
      theme: 'Ethnic Polarization & Crisis Misinformation',
      scenes: [
        // ── ENTRY ──
        {
          order: 1,
          title: 'Telegram Forwarded Video',
          description:
            'A shaky night-vision video of a burning building appears in your group with alarming claims.',
          sceneType: 'INVESTIGATION',
          contentType: SceneContentType.VIDEO,
          availableChoices: [
            'FORWARD',
            'POST_ANGRY_STATUS',
            'SEARCH_NEWS',
            'MUTE_SLEEP',
          ],
          content: {
            textBody:
              '🚨 FORWARDED MESSAGE — [Luma City] Youth Watch\n\n🎥 [Shaky night-vision video of a building on fire]\n\n"BREAKING: THE ATTACK HAS STARTED. They are burning the homes in Beko Town while people sleep! The local authorities are standing by and doing nothing. We are being targeted again. Don\'t let them die in silence."\n\n👁️ 15.4K views in 10 minutes\n💬 "Where is the government?!"\n💬 "We must defend ourselves!"\n💬 "Forward this to everyone now!"',
          },
          choices: [
            {
              label: 'FORWARD',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Network Propagation Map',
            },
            {
              label: 'POST_ANGRY_STATUS',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Friends Reacting To Status',
            },
            {
              label: 'SEARCH_NEWS',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'No Reports Found',
            },
            {
              label: 'MUTE_SLEEP',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Morning After Silence',
            },
          ],
        },
        // ── BRANCH A: FORWARD ──
        {
          order: 2,
          title: 'Network Propagation Map',
          description:
            'A visual map shows how your forward created a chain reaction across groups.',
          sceneType: 'ANALYSIS',
          contentType: SceneContentType.TEXT,
          availableChoices: ['CONTINUE'],
          content: {
            textBody:
              '📈 Network Propagation Map:\n\nYour forward reached 5 community groups instantly.\nBecause you are a "Trusted Member," your share increased the "Panic Score" of 450 people by 80%.\n\nA chain reaction is forming — people are organizing a "response."',
          },
          choices: [
            {
              label: 'CONTINUE',
              actionType: PlayerActionType.NEXT,
              nextSceneTitle: 'Voice Note Appears',
            },
          ],
        },
        // ── VOICE NOTE (shared by Branch A and B) ──
        {
          order: 3,
          title: 'Voice Note Appears',
          description:
            'A crying voice note appears — a woman begging for help. It sounds devastatingly real.',
          sceneType: 'DECISION',
          contentType: SceneContentType.TEXT,
          availableChoices: ['MARK_VERIFIED', 'IGNORE_VOICE_NOTE'],
          content: {
            textBody:
              '🎙️ Voice Note (0:47):\n\n[Woman crying, sirens in background]\n"I am hiding under the bed... I can hear them shouting outside. They are coming for us because of our identity. Please, if you see this, get the youth to come to Beko Town! We need help!"\n\nThe group poll asks: "Mark as Verified?"\n\n⚠️ The voice sounds authentic. The emotion is raw. It confirms the video you just saw.',
          },
          choices: [
            {
              label: 'MARK_VERIFIED',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Community Protector Badge',
            },
            {
              label: 'IGNORE_VOICE_NOTE',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Morning After Tragedy',
            },
          ],
        },
        // ── FALSE PRIDE ──
        {
          order: 4,
          title: 'Community Protector Badge',
          description:
            'You feel proud — you\'re helping coordinate a community response.',
          sceneType: 'INVESTIGATION',
          contentType: SceneContentType.TEXT,
          availableChoices: ['CONTINUE_TO_MORNING'],
          content: {
            textBody:
              '🎉 Community Milestone!\n\nYou have been awarded the "Community Protector" badge.\nBecause of your quick reporting, 2,000 people are now coordinating a "Response" in the chat.\n\nYou feel like you are saving lives.',
          },
          choices: [
            {
              label: 'CONTINUE_TO_MORNING',
              actionType: PlayerActionType.NEXT,
              nextSceneTitle: 'Morning After Tragedy',
            },
          ],
        },
        // ── THE MORNING AFTER (TRAGEDY) ──
        {
          order: 5,
          title: 'Morning After Tragedy',
          description:
            'You wake up at 6:00 AM to devastating news.',
          sceneType: 'ANALYSIS',
          contentType: SceneContentType.TEXT,
          availableChoices: ['VIEW_INVESTIGATION'],
          content: {
            textBody:
              '⏰ 6:00 AM — Morning News Notification:\n\n📰 HEADLINE: "Tragedy in Beko Town: 4 Innocents Killed in Mob Violence"\n\nA group of angry youth gathered at the location and attacked a passing vehicle, thinking they were the "enemy." Four people — including a teacher and a university student — were killed.',
          },
          choices: [
            {
              label: 'VIEW_INVESTIGATION',
              actionType: PlayerActionType.NEXT,
              nextSceneTitle: 'Investigation Reveal',
            },
          ],
        },
        // ── INVESTIGATION REVEAL & LESSON ──
        {
          order: 6,
          title: 'Investigation Reveal',
          description:
            'The full investigation reveals every piece of "evidence" was fabricated.',
          sceneType: 'ANALYSIS',
          contentType: SceneContentType.TEXT,
          availableChoices: ['ACKNOWLEDGE'],
          isTerminal: true,
          content: {
            textBody:
              '🔍 INVESTIGATION REVEAL:\n\n1️⃣ THE VIDEO: Red lines circle the footage. It was NOT an attack — it was a gas leak fire from a restaurant in a different country, filmed in 2021.\n\n2️⃣ THE AUDIO: An AI Detection overlay shows the woman\'s crying voice note was a DEEPFAKE — created using a 10-second clip of a local actress.\n\n3️⃣ THE RIPPLE: Because you and others forwarded the "call to help," a mob gathered and killed 4 innocent people.\n\n━━━━━━━━━━━━━━━━━━━━\n📊 YOUR TIMELINE:\n• Shared the Video → Turned a 3-year-old accident into a current ethnic attack\n• Validated the Audio → Gave a fake voice credibility\n• Trusted the Group → Let groupthink replace your own judgment\n\n📉 Trust Score: -50\n📉 Societal Impact: HIGH (Violence Incited)\n\n🧠 REMEMBER:\n"In a crisis, your anger is a weapon used by others."\n1. Check the Date — scammers use old videos\n2. Beware the "Forwarded" tag — if you don\'t know the source, you\'re part of a game you don\'t control\n3. The 5-Minute Rule — if a post makes you want to act violently, wait 5 minutes. Real news will be on official channels.',
          },
          choices: [
            {
              label: 'ACKNOWLEDGE',
              actionType: PlayerActionType.FINISH,
              outcome: {
                trustScoreDelta: -50,
                outcomeType: OutcomeType.FAIL,
                endScenario: true,
                message:
                  'Your actions contributed to real-world violence. Every forward, every "verified" mark, every emotional reaction was exploited. Learn from this.',
              },
            },
          ],
        },
        // ── BRANCH B: ANGRY STATUS ──
        {
          order: 7,
          title: 'Friends Reacting To Status',
          description:
            'Your angry status post is trending in youth circles.',
          sceneType: 'INVESTIGATION',
          contentType: SceneContentType.FEED,
          availableChoices: ['CONTINUE_TO_VOICE'],
          content: {
            textBody:
              '📱 Your Post: "Enough is enough! Protect Beko Town! 💔🔥"\n\n🔄 Shared 340 times in 20 minutes\n💬 "We stand with you!"\n💬 "This is war!"\n💬 "Everyone meet at the junction NOW"\n\nYour post is trending in local youth circles. You feel validated.',
          },
          choices: [
            {
              label: 'CONTINUE_TO_VOICE',
              actionType: PlayerActionType.NEXT,
              nextSceneTitle: 'Voice Note Appears',
            },
          ],
        },
        // ── BRANCH C: SEARCH NEWS ──
        {
          order: 8,
          title: 'No Reports Found',
          description:
            'You search official news sites — nothing confirms the attack.',
          sceneType: 'ANALYSIS',
          contentType: SceneContentType.TEXT,
          availableChoices: ['CONTINUE_TO_VOICE_C'],
          content: {
            textBody:
              '🔍 News Search Results:\n\n✅ National News Agency — No reports of attacks tonight\n✅ BBC Amharic — No breaking news\n✅ Local Police Twitter — "All districts calm. No incidents reported."\n\n⚠️ WARNING: No official sources confirm this video.\n\nBut the Telegram group is getting louder...',
          },
          choices: [
            {
              label: 'CONTINUE_TO_VOICE_C',
              actionType: PlayerActionType.NEXT,
              nextSceneTitle: 'Voice Note After Search',
            },
          ],
        },
        // ── VOICE NOTE (BRANCH C VERSION — you already searched) ──
        {
          order: 9,
          title: 'Voice Note After Search',
          description:
            'Despite finding no news confirmation, the emotional voice note still pulls at you.',
          sceneType: 'DECISION',
          contentType: SceneContentType.TEXT,
          availableChoices: ['MARK_AS_VERIFIED_C', 'REPORT_SUSPICIOUS'],
          content: {
            textBody:
              '🎙️ Voice Note appears in the group (0:47):\n\n[Woman crying, sirens]\n"I am hiding under the bed... They are coming for us..."\n\nYou already know NO official source confirms any attack.\nBut the emotion is overwhelming. 500 people are asking: "Is this real?"\n\nThe group poll: "Mark as Verified?"',
          },
          choices: [
            {
              label: 'MARK_AS_VERIFIED_C',
              actionType: PlayerActionType.CHOICE,
              nextSceneTitle: 'Community Protector Badge',
            },
            {
              label: 'REPORT_SUSPICIOUS',
              actionType: PlayerActionType.CHOICE,
              outcome: {
                trustScoreDelta: 30,
                outcomeType: OutcomeType.PASS,
                endScenario: true,
                message:
                  '✅ You stopped a false alarm. Your calm, evidence-based response prevented panic. The video was later confirmed as a 3-year-old gas leak from another country, and the voice note was a deepfake. Because you searched the news FIRST and reported it as suspicious, the group admin pinned your message and 450 people stood down. No one was hurt tonight.',
              },
            },
          ],
        },
        // ── BRANCH D: MUTE & SLEEP ──
        {
          order: 10,
          title: 'Morning After Silence',
          description:
            'You muted the group and went to sleep. You wake up to tragedy.',
          sceneType: 'ANALYSIS',
          contentType: SceneContentType.TEXT,
          availableChoices: ['ACKNOWLEDGE_SILENCE'],
          isTerminal: true,
          content: {
            textBody:
              '⏰ 6:00 AM — You wake up to 247 unread messages.\n\n📰 HEADLINE: "Tragedy in Beko Town: 4 Innocents Killed in Mob Violence"\n\nWhile you slept, the fake video spread to 50,000 people. A mob formed. Four people died.\n\n🧠 "Silence did not stop the harm."\n\nYou had the option to verify and report — but you chose comfort over responsibility. In a crisis, muting is not neutrality — it is abdication.',
          },
          choices: [
            {
              label: 'ACKNOWLEDGE_SILENCE',
              actionType: PlayerActionType.FINISH,
              outcome: {
                trustScoreDelta: -15,
                outcomeType: OutcomeType.FAIL,
                endScenario: true,
                message:
                  'Silence did not stop the harm. Four people died while you slept. In a crisis, choosing not to act is still a choice — and it has consequences.',
              },
            },
          ],
        },
      ],
    });

    this.logger.log('Scenarios seeded successfully');
  }

  private async createScenario(data: any) {
    const existing = await this.scenarioRepository.findOne({
      where: { title: data.title },
    });

    if (existing) {
      this.logger.log(`Scenario already exists: ${data.title}`);
      return;
    }

    // Get the specific game level
    const gameLevel = await this.gameLevelRepository.findOne({
      where: { levelNumber: data.levelNumber ?? 1 },
    });

    const scenario = this.scenarioRepository.create({
      title: data.title,
      description: data.description,
      scenarioType: data.scenarioType,
      difficulty: data.difficulty,
      gameLevelId: gameLevel?.id,
      isActive: true,
      learningObjective: data.learningObjective,
      behavioralRisk: data.behavioralRisk,
      psychologicalTrigger: data.psychologicalTrigger,
      preventionLesson: data.preventionLesson,
      theme: data.theme,
    });

    const savedScenario = await this.scenarioRepository.save(scenario);
    this.logger.log(`Created scenario: ${data.title}`);

    const sceneMap = new Map<string, string>(); // Title -> ID

    // Create scenes first
    for (const sceneData of data.scenes) {
      const scene = this.sceneRepository.create({
        scenarioId: savedScenario.id,
        title: sceneData.title,
        description: sceneData.description,
        order: sceneData.order,
        sceneType: sceneData.sceneType,
        contentType: sceneData.contentType,
        availableChoices: sceneData.availableChoices,
        isTerminal: sceneData.isTerminal || false,
      });

      const savedScene = await this.sceneRepository.save(scene);
      sceneMap.set(sceneData.title, savedScene.id);

      // Create scene content
      const content = this.sceneContentRepository.create({
        sceneId: savedScene.id,
        contentType: sceneData.contentType,
        ...sceneData.content,
      });

      await this.sceneContentRepository.save(content);
    }

    // Create choices and their outcomes
    for (const sceneData of data.scenes) {
      const currentSceneId = sceneMap.get(sceneData.title);
      if (!currentSceneId) continue;

      if (sceneData.choices) {
        for (const choiceData of sceneData.choices) {
          const choice = this.playerChoiceRepository.create({
            sceneId: currentSceneId,
            label: choiceData.label,
            actionType: choiceData.actionType,
            nextSceneId: choiceData.nextSceneTitle
              ? sceneMap.get(choiceData.nextSceneTitle)
              : undefined,
          });
          const savedChoice = await this.playerChoiceRepository.save(choice);

          if (choiceData.outcome) {
            const outcome = this.gameOutcomeRepository.create({
              scenarioId: savedScenario.id,
              playerChoiceId: savedChoice.id,
              outcomeType: choiceData.outcome.outcomeType,
              trustScoreDelta: choiceData.outcome.trustScoreDelta,
              message: choiceData.outcome.message,
              endScenario: choiceData.outcome.endScenario,
              score: choiceData.outcome.score || 0,
            });
            await this.gameOutcomeRepository.save(outcome);
          }
        }
      }
    }

    this.logger.log(`Setup ${data.scenes.length} scenes for: ${data.title}`);
  }
}
