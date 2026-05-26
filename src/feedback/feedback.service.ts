import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { FeedbackQueryDto } from './dto/feedback-query.dto';
import { FeedbackStatus } from '../shared/enums/feedback-status.enum';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  async create(
    userId: string | null,
    createDto: CreateFeedbackDto,
  ): Promise<Feedback> {
    const feedback = this.feedbackRepository.create({
      ...createDto,
      userId,
    });
    return this.feedbackRepository.save(feedback);
  }

  async findAll(query: FeedbackQueryDto): Promise<any> {
    const {
      scenarioId,
      status,
      priority,
      type,
      assignedTo,
      page = 1,
      limit = 10,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.scenario', 'scenario')
      .leftJoinAndSelect('feedback.user', 'user')
      .leftJoinAndSelect('feedback.assignee', 'assignee')
      .skip(skip)
      .take(limit)
      .orderBy('feedback.createdAt', 'DESC');

    if (scenarioId) {
      queryBuilder.andWhere('feedback.scenarioId = :scenarioId', {
        scenarioId,
      });
    }

    if (status) {
      queryBuilder.andWhere('feedback.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('feedback.priority = :priority', { priority });
    }

    if (type) {
      queryBuilder.andWhere('feedback.type = :type', { type });
    }

    if (assignedTo) {
      queryBuilder.andWhere('feedback.assignedTo = :assignedTo', {
        assignedTo,
      });
    }

    const [feedbacks, total] = await queryBuilder.getManyAndCount();

    return {
      data: feedbacks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Feedback> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id },
      relations: ['scenario', 'user', 'assignee'],
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    return feedback;
  }

  async update(id: string, updateDto: UpdateFeedbackDto): Promise<Feedback> {
    await this.feedbackRepository.update(id, updateDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.feedbackRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }
  }

  async getStats(): Promise<any> {
    const totalOpen = await this.feedbackRepository.count({
      where: { status: FeedbackStatus.OPEN },
    });

    const byPriority = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .select('feedback.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('feedback.priority')
      .getRawMany();

    const overdueItems = await this.feedbackRepository.count({
      where: {
        status: FeedbackStatus.OPEN,
        deadline: LessThan(new Date()),
      },
    });

    return {
      totalOpen,
      byPriority: byPriority.reduce((acc, curr) => {
        acc[curr.priority] = parseInt(curr.count);
        return acc;
      }, {}),
      overdueItems,
    };
  }
}
