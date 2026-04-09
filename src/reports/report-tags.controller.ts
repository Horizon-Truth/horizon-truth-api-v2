import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportTagsService } from './report-tags.service';
import { CreateReportTagDto } from './dto/create-report-tag.dto';
import { UpdateReportTagDto } from './dto/update-report-tag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Report Tags')
@Controller('report-tags')
export class ReportTagsController {