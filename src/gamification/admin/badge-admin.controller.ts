import { Controller, Post, Body, UseGuards, Put, Param, Delete, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../shared/enums/user-role.enum';
import { GamificationService } from '../gamification.service';
import { CreateBadgeDto } from '../dto/create-badge.dto';
import { UpdateBadgeDto } from '../dto/update-badge.dto';

@ApiTags('Admin - Badges')
@Controller('gamification/admin/badges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
@ApiBearerAuth()
export class BadgeAdminController {
    constructor(private readonly gamificationService: GamificationService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new badge' })
    @ApiResponse({ status: 201, description: 'Badge created successfully.' })
    async create(@Body() createDto: CreateBadgeDto) {
        return this.gamificationService.createBadge(createDto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a badge' })
    @ApiResponse({ status: 200, description: 'Badge updated successfully.' })
    async update(@Param('id') id: string, @Body() updateDto: UpdateBadgeDto) {
        return this.gamificationService.updateBadge(id, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a badge' })
    @ApiResponse({ status: 200, description: 'Badge deleted successfully.' })
    async remove(@Param('id') id: string) {
        return this.gamificationService.deleteBadge(id);
    }
}
