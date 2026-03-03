import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums/user-role.enum';
import { OrganizationsService } from './organizations.service';
import { OrganizationStatus } from '../shared/enums/organization-status.enum';

@ApiTags('Admin / Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
@Controller('admin/organizations')
export class AdminOrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) { }

  @Get()
  @ApiOperation({ summary: 'List all organizations (Admin only)' })
  async findAll(@Query() query: any) {
    return this.organizationsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details' })
  async findOne(@Param('id') id: string) {
    return this.organizationsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new organization' })
  async create(@Body() createDto: any) {
    return this.organizationsService.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update organization' })
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.organizationsService.update(id, updateDto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update organization status' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrganizationStatus,
  ) {
    return this.organizationsService.updateStatus(id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization' })
  async remove(@Param('id') id: string) {
    return this.organizationsService.delete(id);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Get organization users' })
  async findUsers(@Param('id') id: string) {
    return this.organizationsService.findOrganizationUsers(id);
  }

  @Post(':id/users')
  @ApiOperation({ summary: 'Add user to organization' })
  async addUser(
    @Param('id') id: string,
    @Body() data: { userId: string; role: string },
  ) {
    return this.organizationsService.addOrganizationUser(id, data.userId, data.role);
  }
}
