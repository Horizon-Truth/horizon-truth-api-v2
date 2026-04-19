import {
  Controller,
  Get,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums/user-role.enum';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'List all audit logs (SYSTEM_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Return paginated audit logs.' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.auditLogsService.findAll({
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      userId,
      action,
      entityType,
    });
  }

  @Get('export')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Export audit logs as CSV (SYSTEM_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Return audit logs as CSV file.' })
  async export(
    @Query('userId') userId: string,