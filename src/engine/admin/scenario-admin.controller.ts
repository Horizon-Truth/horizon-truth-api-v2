import { Controller, Post, Body, UseGuards, Put, Param, Delete, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../shared/enums/user-role.enum';
import { EngineService } from '../engine.service';
import { CreateScenarioDto } from '../dto/create-scenario.dto';
import { UpdateScenarioDto } from '../dto/update-scenario.dto';

@ApiTags('Admin - Scenarios')
@Controller('engine/admin/scenarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
@ApiBearerAuth()
export class ScenarioAdminController {
    constructor(private readonly engineService: EngineService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new scenario' })
    @ApiResponse({ status: 201, description: 'Scenario created successfully.' })
    async create(@Body() createDto: CreateScenarioDto) {
        return this.engineService.createScenario(createDto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a scenario' })
    @ApiResponse({ status: 200, description: 'Scenario updated successfully.' })
    async update(@Param('id') id: string, @Body() updateDto: UpdateScenarioDto) {
        return this.engineService.updateScenario(id, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a scenario' })
    @ApiResponse({ status: 200, description: 'Scenario deleted successfully.' })
    async remove(@Param('id') id: string) {
        return this.engineService.deleteScenario(id);
    }
}
