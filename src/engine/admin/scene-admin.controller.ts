import {
    Controller,
    Post,
    Body,
    UseGuards,
    Put,
    Param,
    Delete,
    Get,
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
import { CreateSceneDto } from '../dto/create-scene.dto';
import { UpdateSceneDto } from '../dto/update-scene.dto';

@ApiTags('Admin - Scenes')
@Controller('engine/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
@ApiBearerAuth()
export class SceneAdminController {
    constructor(private readonly engineService: EngineService) { }

    @Get('scenarios/:scenarioId/scenes')
    @ApiOperation({ summary: 'Get all scenes for a scenario' })
    @ApiResponse({ status: 200, description: 'Scenes retrieved successfully.' })
    async getScenes(@Param('scenarioId') scenarioId: string) {
        return this.engineService.getScenes(scenarioId);
    }

    @Post('scenarios/:scenarioId/scenes')
    @ApiOperation({ summary: 'Create a new scene for a scenario' })
    @ApiResponse({ status: 201, description: 'Scene created successfully.' })
    async createScene(
        @Param('scenarioId') scenarioId: string,
        @Body() createDto: CreateSceneDto,
    ) {
        return this.engineService.createScene(scenarioId, createDto);
    }

    @Put('scenes/:id')
    @ApiOperation({ summary: 'Update a scene' })
    @ApiResponse({ status: 200, description: 'Scene updated successfully.' })
    async updateScene(@Param('id') id: string, @Body() updateDto: UpdateSceneDto) {
        return this.engineService.updateScene(id, updateDto);
    }

    @Delete('scenes/:id')
    @ApiOperation({ summary: 'Delete a scene' })
    @ApiResponse({ status: 200, description: 'Scene deleted successfully.' })
    async removeScene(@Param('id') id: string) {
        return this.engineService.deleteScene(id);
    }
}
