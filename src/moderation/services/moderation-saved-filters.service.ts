import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModerationSavedFilter } from '../entities/moderation-saved-filter.entity';
import {
  CreateSavedFilterDto,
  UpdateSavedFilterDto,
} from '../dto/analytics.dto';
import { ModerationActor } from '../moderation-actor';
import { ModerationPermission } from '../../shared/enums/moderation-permission.enum';
import { actorCan } from '../moderation-actor';

/** Named queue views. Personal unless explicitly shared with the whole team. */
@Injectable()
export class ModerationSavedFiltersService {
  constructor(
    @InjectRepository(ModerationSavedFilter)
    private readonly filterRepo: Repository<ModerationSavedFilter>,
  ) {}

  /** The caller's own filters plus every shared one. */
  async listFor(actor: ModerationActor): Promise<ModerationSavedFilter[]> {
    return this.filterRepo
      .createQueryBuilder('f')
      .where('f.ownerId = :ownerId', { ownerId: actor.userId })
      .orWhere('f.isShared = true')
      .orderBy('f.sortOrder', 'ASC')
      .addOrderBy('f.name', 'ASC')
      .getMany();
  }

  async create(
    dto: CreateSavedFilterDto,
    actor: ModerationActor,
  ): Promise<ModerationSavedFilter> {
    if (dto.isShared && !actorCan(actor, ModerationPermission.MANAGE_FLAGS)) {
      throw new ForbiddenException(
        'Sharing a filter with the whole team requires the MANAGE_FLAGS permission.',
      );
    }

    const duplicate = await this.filterRepo.findOne({
      where: { ownerId: actor.userId, name: dto.name },
    });
    if (duplicate) {
      throw new ConflictException(
        `You already have a saved filter called "${dto.name}".`,
      );
    }

    return this.filterRepo.save(
      this.filterRepo.create({ ...dto, ownerId: actor.userId }),
    );
  }

  async update(
    id: string,
    dto: UpdateSavedFilterDto,
    actor: ModerationActor,
  ): Promise<ModerationSavedFilter> {
    const filter = await this.requireOwned(id, actor);
    Object.assign(filter, dto);
    return this.filterRepo.save(filter);
  }

  async remove(id: string, actor: ModerationActor): Promise<{ deleted: true }> {
    const filter = await this.requireOwned(id, actor);
    await this.filterRepo.delete(filter.id);
    return { deleted: true };
  }

  private async requireOwned(
    id: string,
    actor: ModerationActor,
  ): Promise<ModerationSavedFilter> {
    const filter = await this.filterRepo.findOne({ where: { id } });
    if (!filter) throw new NotFoundException('Saved filter not found');

    if (filter.ownerId !== actor.userId) {
      throw new ForbiddenException(
        'You can only change your own saved filters.',
      );
    }

    return filter;
  }
}
