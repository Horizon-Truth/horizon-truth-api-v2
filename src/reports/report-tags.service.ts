import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportTag } from './entities/report-tag.entity';
import { CreateReportTagDto } from './dto/create-report-tag.dto';
import { UpdateReportTagDto } from './dto/update-report-tag.dto';