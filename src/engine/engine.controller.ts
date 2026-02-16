import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EngineService } from './engine.service';
import { StartGameDto } from './dto/start-game.dto';
import { SubmitChoiceDto } from './dto/submit-choice.dto';
import { ScenarioQueryDto } from './dto/scenario-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Game Engine')
@Controller('engine')
export class EngineController {
    constructor(private readonly engineService: EngineService) { }

    @Get('scenarios')
    @ApiOperation({ summary: 'List all available game scenarios' })
    @ApiResponse({ status: 200, description: 'Scenarios retrieved successfully.' })
    async getScenarios(@Query() query: ScenarioQueryDto) {
        return this.engineService.getScenarios(query);
    }

    @Get('scenarios/:id')
    @ApiOperation({ summary: 'Get scenario details by ID' })
    @ApiResponse({ status: 200, description: 'Scenario details retrieved.' })
    @ApiResponse({ status: 404, description: 'Scenario not found.' })
    async getScenarioById(@Param('id') id: string) {
        return this.engineService.getScenarioById(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('game/start')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Start a new game session' })
    @ApiResponse({ status: 201, description: 'Game started successfully.' })
    @ApiResponse({ status: 404, description: 'Scenario not found.' })
    @ApiResponse({ status: 400, description: 'Scenario is not active.' })
    async startGame(@Request() req, @Body() startGameDto: StartGameDto) {
        return this.engineService.startGame(req.user.userId, startGameDto.scenarioId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('game/progress/:id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get game progress details' })
    @ApiResponse({ status: 200, description: 'Game progress retrieved.' })
    @ApiResponse({ status: 404, description: 'Game progress not found.' })
    async getGameProgress(@Param('id') id: string) {
        return this.engineService.getGameProgress(id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('game/current-scene/:progressId')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current scene for a game session' })
    @ApiResponse({ status: 200, description: 'Current scene retrieved.' })
    @ApiResponse({ status: 404, description: 'Game progress not found.' })
    async getCurrentScene(@Param('progressId') progressId: string) {
        return this.engineService.getCurrentScene(progressId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('game/choice')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Submit a player choice' })
    @ApiResponse({ status: 200, description: 'Choice submitted successfully.' })
    @ApiResponse({ status: 400, description: 'Invalid choice or game state.' })
    @ApiResponse({ status: 404, description: 'Game progress not found.' })
    async submitChoice(@Request() req, @Body() submitChoiceDto: SubmitChoiceDto) {
        return this.engineService.submitChoice(req.user.userId, submitChoiceDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('game/:progressId/outcome')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get game outcome for a completed game' })
    @ApiResponse({ status: 200, description: 'Game outcome retrieved.' })
    @ApiResponse({ status: 404, description: 'Game outcome not found.' })
    async getGameOutcome(@Param('progressId') progressId: string) {
        return this.engineService.getGameOutcome(progressId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('game/history/me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user game history' })
    @ApiResponse({ status: 200, description: 'Game history retrieved.' })
    async getMyGameHistory(@Request() req, @Query('scenarioId') scenarioId?: string) {
        return this.engineService.getUserProgress(req.user.userId, scenarioId);
    }
}
