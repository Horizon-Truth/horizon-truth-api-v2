import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { ModerationNote } from '../entities/moderation-note.entity';
import { ModerationNoteRevision } from '../entities/moderation-note-revision.entity';
import { ModerationNotificationType } from '../entities/moderation-notification.entity';
import { User } from '../../users/entities/user.entity';
import { ModerationTargetType } from '../../shared/enums/moderation-target-type.enum';
import { ModerationActionType } from '../../shared/enums/moderation-action-type.enum';
import { UserRole } from '../../shared/enums/user-role.enum';
import {
  CreateModeratorNoteDto,
  UpdateModeratorNoteDto,
} from '../dto/user-actions.dto';
import { ModerationActor } from '../moderation-actor';
import { ModerationAuditService } from './moderation-audit.service';
import { ModerationNotificationsService } from './moderation-notifications.service';

/** `@username` mentions, captured so the author can notify colleagues inline. */
const MENTION_PATTERN = /@([a-zA-Z0-9_.-]{3,50})/g;

export interface NoteScope {
  incidentReportId?: string | null;
  targetType?: ModerationTargetType | null;
  targetId?: string | null;
}

/**
 * Private moderator notes.
 *
 * Notes are never returned to the person they concern — no controller route
 * exposes them below moderator level. Edits keep the previous body as a
 * revision so a note cannot be quietly rewritten after a decision.
 */
@Injectable()
export class ModerationNotesService {
  constructor(
    @InjectRepository(ModerationNote)
    private readonly noteRepo: Repository<ModerationNote>,
    @InjectRepository(ModerationNoteRevision)
    private readonly revisionRepo: Repository<ModerationNoteRevision>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly audit: ModerationAuditService,
    private readonly notifications: ModerationNotificationsService,
  ) {}

  async create(
    scope: NoteScope,
    dto: CreateModeratorNoteDto,
    actor: ModerationActor,
  ): Promise<ModerationNote> {
    const mentioned = await this.resolveMentions(dto);

    const note = await this.noteRepo.save(
      this.noteRepo.create({
        incidentReportId: scope.incidentReportId ?? null,
        targetType: scope.targetType ?? null,
        targetId: scope.targetId ?? null,
        authorId: actor.userId,
        body: dto.body,
        attachments: dto.attachments ?? null,
        mentionedUserIds: mentioned.length ? mentioned : null,
        version: 1,
      }),
    );

    await this.audit.record({
      actor,
      action: ModerationActionType.NOTE_ADDED,
      incidentReportId: scope.incidentReportId ?? null,
      notes: dto.body,
      affectedObjectType: 'moderation_note',
      affectedObjectId: note.id,
      newValue: { noteId: note.id },
    });

    await this.notifyMentions(note, mentioned, actor);

    return this.findOne(note.id);
  }

  async findOne(id: string): Promise<ModerationNote> {
    const note = await this.noteRepo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['author'],
    });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async list(
    scope: NoteScope,
    options: { search?: string; page?: number; limit?: number } = {},
  ) {
    const { search, page = 1, limit = 20 } = options;

    const qb = this.noteRepo
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.author', 'author')
      .where('n.deletedAt IS NULL')
      .orderBy('n.createdAt', 'DESC');

    if (scope.incidentReportId) {
      qb.andWhere('n.incidentReportId = :caseId', {
        caseId: scope.incidentReportId,
      });
    }

    if (scope.targetType && scope.targetId) {
      qb.andWhere('n.targetType = :targetType AND n.targetId = :targetId', {
        targetType: scope.targetType,
        targetId: scope.targetId,
      });
    }

    if (search) {
      qb.andWhere('n.body ILIKE :search', { search: `%${search}%` });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Edit a note. The author may edit their own; administrators may edit any,
   * because a note containing personal data sometimes has to be corrected.
   */
  async update(
    id: string,
    dto: UpdateModeratorNoteDto,
    actor: ModerationActor,
  ): Promise<ModerationNote> {
    const note = await this.findOne(id);
    this.assertMayModify(note, actor);

    await this.dataSource.transaction(async (manager) => {
      await manager.save(
        manager.create(ModerationNoteRevision, {
          noteId: note.id,
          version: note.version,
          body: note.body,
          attachments: note.attachments ?? null,
          editedById: actor.userId,
        }),
      );

      await manager.update(
        ModerationNote,
        { id: note.id },
        {
          body: dto.body,
          attachments: dto.attachments ?? note.attachments ?? null,
          version: note.version + 1,
        },
      );
    });

    await this.audit.record({
      actor,
      action: ModerationActionType.NOTE_ADDED,
      incidentReportId: note.incidentReportId ?? null,
      notes: 'Note edited',
      affectedObjectType: 'moderation_note',
      affectedObjectId: note.id,
      previousValue: { version: note.version, body: note.body },
      newValue: { version: note.version + 1, body: dto.body },
    });

    return this.findOne(id);
  }

  /** Soft delete — the revision history and the audit trail remain. */
  async remove(id: string, actor: ModerationActor): Promise<{ deleted: true }> {
    const note = await this.findOne(id);
    this.assertMayModify(note, actor);

    await this.noteRepo.update({ id }, { deletedAt: new Date() });

    await this.audit.record({
      actor,
      action: ModerationActionType.NOTE_ADDED,
      incidentReportId: note.incidentReportId ?? null,
      notes: 'Note deleted',
      affectedObjectType: 'moderation_note',
      affectedObjectId: note.id,
      previousValue: { body: note.body },
      newValue: { deleted: true },
    });

    return { deleted: true };
  }

  async revisions(id: string): Promise<ModerationNoteRevision[]> {
    await this.findOne(id);
    return this.revisionRepo.find({
      where: { noteId: id },
      relations: ['editedBy'],
      order: { version: 'DESC' },
    });
  }

  // --- internals ---------------------------------------------------------

  private assertMayModify(note: ModerationNote, actor: ModerationActor): void {
    const isAuthor = note.authorId === actor.userId;
    const isAdmin =
      actor.role === UserRole.ORG_ADMIN || actor.role === UserRole.SYSTEM_ADMIN;

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        'Only the note author or an administrator can change this note.',
      );
    }
  }

  /**
   * Combine explicit ids with `@username` mentions parsed from the body.
   * Only moderation staff are resolvable — mentioning a player would leak the
   * existence of a private note to them.
   */
  private async resolveMentions(
    dto: CreateModeratorNoteDto,
  ): Promise<string[]> {
    const usernames = [...dto.body.matchAll(MENTION_PATTERN)].map((m) => m[1]);

    const byUsername = usernames.length
      ? await this.userRepo.find({
          where: { username: In(usernames) },
          select: ['id', 'role'],
        })
      : [];

    const explicit = dto.mentionedUserIds?.length
      ? await this.userRepo.find({
          where: { id: In(dto.mentionedUserIds) },
          select: ['id', 'role'],
        })
      : [];

    return [...new Set([...byUsername, ...explicit])]
      .filter((u) => u.role !== UserRole.PLAYER)
      .map((u) => u.id);
  }

  private async notifyMentions(
    note: ModerationNote,
    mentioned: string[],
    actor: ModerationActor,
  ): Promise<void> {
    await Promise.all(
      mentioned
        .filter((id) => id !== actor.userId)
        .map((recipientId) =>
          this.notifications.notify({
            recipientId,
            type: ModerationNotificationType.NOTE_MENTION,
            title: 'You were mentioned in a moderator note',
            body: note.body.slice(0, 200),
            link: note.incidentReportId
              ? `/dashboard/moderation/cases/${note.incidentReportId}`
              : '/dashboard/moderation',
            metadata: { noteId: note.id },
          }),
        ),
    );
  }
}
