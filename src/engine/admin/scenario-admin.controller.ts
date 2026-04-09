import {
  Controller,
  Post,
  Body,
  UseGuards,
  Put,
  Param,
  Delete,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../shared/enums/user-role.enum';
import { EngineService } from '../engine.service';
import { CreateScenarioDto } from '../dto/create-scenario.dto';
import { UpdateScenarioDto } from '../dto/update-scenario.dto';
import { ExportScenarioDto } from '../dto/export-scenario.dto';
import { CreateLevelDto } from '../dto/create-level.dto';
import { UpdateLevelDto } from '../dto/update-level.dto';

@ApiTags('Admin - Scenarios')
@Controller('engine/admin/scenarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
@ApiBearerAuth()
export class ScenarioAdminController {
  constructor(private readonly engineService: EngineService) {}

  @Get('levels')
  @ApiOperation({ summary: 'Get all game levels for selection' })
  @ApiResponse({ status: 200, description: 'Levels retrieved successfully.' })
  async getLevels() {
    return this.engineService.getLevels();
  }

  @Post('levels')
  @ApiOperation({ summary: 'Create a new game level' })
  @ApiResponse({ status: 201, description: 'Level created successfully.' })
  async createLevel(@Body() dto: CreateLevelDto) {
    return this.engineService.createLevel(dto);
  }

  @Put('levels/:id')
  @ApiOperation({ summary: 'Update a game level' })
  @ApiResponse({ status: 200, description: 'Level updated successfully.' })
  async updateLevel(@Param('id') id: string, @Body() dto: UpdateLevelDto) {
    return this.engineService.updateLevel(id, dto);
  }

  @Delete('levels/:id')
  @ApiOperation({ summary: 'Delete a game level' })
  @ApiResponse({ status: 200, description: 'Level deleted successfully.' })
  async removeLevel(@Param('id') id: string) {
    return this.engineService.deleteLevel(id);
  }

  @Post('export')
  @ApiOperation({ summary: 'Export scenarios to JSON' })
  @ApiResponse({ status: 200, description: 'Scenarios exported successfully.' })
  async export(@Body() exportDto: ExportScenarioDto) {
    return this.engineService.exportScenarios(exportDto.ids);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import scenarios from JSON' })
  @ApiResponse({ status: 200, description: 'Scenarios imported successfully.' })
  async import(@Body() scenarios: any[]) {
    return this.engineService.importScenarios(scenarios);
  }

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

  @Get()
  @ApiOperation({ summary: 'Get all scenarios for management' })
  @ApiResponse({ status: 200, description: 'Scenarios retrieved successfully.' })
  async getScenarios(@Query() query: any) {
    return this.engineService.getScenarios(query);
  }
}
