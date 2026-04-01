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