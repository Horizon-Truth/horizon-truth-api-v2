import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { AiVerificationService } from './ai-verification.service';
import { CreateReportDto } from './dto/create-report.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { RequestAiVerificationDto } from './dto/request-ai-verification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums/user-role.enum';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly aiVerificationService: AiVerificationService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a new report' })
  create(@Body() createReportDto: CreateReportDto, @Request() req: any) {
    return this.reportsService.create(createReportDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reports' })
  findAll(@Query() query: any) {
    return this.reportsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a report by ID' })
  findOne(@Param('id') id: string) {
    return this.reportsService.findById(id);
  }

  @Post(':id/evidence')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add supporting evidence to a report' })
  addEvidence(@Param('id') id: string, @Body() evidenceDto: AddEvidenceDto, @Request() req: any) {
    return this.reportsService.addEvidence(id, req.user.userId, evidenceDto);
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add community verification to a report' })
  addVerification(
    @Param('id') id: string,
    @Body() verificationData: { comment: string; status: string; rating?: number },
    @Request() req: any,
  ) {
    return this.reportsService.addVerification(id, req.user.userId, verificationData);
  }

  @Get(':id/ai-verification')
  @ApiOperation({
    summary: 'Get the current AI verification for a report',
    description:
      'Returns `{ verification: null }` for reports that have never been analysed — including every report created before this feature existed.',
  })
  async getAiVerification(@Param('id') id: string) {
    const verification = await this.aiVerificationService.findLatestForReport(id);
    return { verification };
  }

  @Post(':id/ai-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Request AI verification for a report',
    description:
      'Idempotent by default: an existing result is returned untouched. Pass `force: true` to run a new attempt; previous attempts are kept as history.',
  })
  async requestAiVerification(
    @Param('id') id: string,
    @Body() dto: RequestAiVerificationDto,
    @Request() req: any,
  ) {
    const verification = await this.aiVerificationService.requestVerification(id, {
      force: dto?.force === true,
      requestedById: req.user?.userId,
    });
    return { verification };
  }

  @Get(':id/ai-verification/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MODERATOR, UserRole.ORG_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List every AI verification attempt for a report (Moderator)' })
  async getAiVerificationHistory(@Param('id') id: string) {
    const attempts = await this.aiVerificationService.findHistoryForReport(id);
    return { attempts };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MODERATOR, UserRole.ORG_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a report (Admin)' })
  update(@Param('id') id: string, @Body() updateDto: any, @Request() req: any) {
    return this.reportsService.update(id, updateDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a report (Admin)' })
  remove(@Param('id') id: string) {
    return this.reportsService.remove(id);
  }
}
