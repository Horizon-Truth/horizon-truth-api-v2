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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { EngineService } from './engine.service';
import { StartGameDto } from './dto/start-game.dto';
import { SubmitChoiceDto } from './dto/submit-choice.dto';
import { ScenarioQueryDto } from './dto/scenario-query.dto';
import { SaveGuestPlayDto } from './dto/save-guest-play.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums/user-role.enum';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('Game Engine')
@Controller('engine')
export class EngineController {
  constructor(private readonly engineService: EngineService) { }

  @Post('guest/play')
  @ApiOperation({ summary: 'Save anonymous guest play data' })
  @ApiResponse({ status: 201, description: 'Guest play saved successfully.' })
  async saveGuestPlay(@Body() saveGuestPlayDto: SaveGuestPlayDto) {
    return this.engineService.saveGuestPlay(saveGuestPlayDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @Get('admin/guest-plays')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all guest plays (Admin only)' })
  @ApiResponse({ status: 200, description: 'Guest plays retrieved.' })
  async getGuestPlays() {
    return this.engineService.getGuestPlays();
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('scenarios')
  @ApiOperation({ summary: 'List all available game scenarios' })
  @ApiResponse({
    status: 200,
    description: 'Scenarios retrieved successfully.',
  })
  async getScenarios(@Request() req, @Query() query: ScenarioQueryDto) {
    // Players should never see archived scenarios
    query.isArchived = false;
    return this.engineService.getScenarios(query, req.user?.userId);
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
    return this.engineService.startGame(
      req.user.userId,
      startGameDto.scenarioId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('game/progress/:progressId/summary')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get investigation reveal summary' })
  @ApiResponse({ status: 200, description: 'Scenario summary retrieved.' })
  @ApiResponse({ status: 404, description: 'Game progress not found.' })
  async getScenarioSummary(
    @Request() req,
    @Param('progressId') progressId: string,
  ) {
    console.log(`[EngineController] getScenarioSummary hit for progressId=${progressId}, userId=${req.user?.userId}`);
    return this.engineService.getScenarioSummary(req.user.userId, progressId);
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
  async getMyGameHistory(
    @Request() req,
    @Query('scenarioId') scenarioId?: string,
  ) {
    return this.engineService.getUserProgress(req.user.userId, scenarioId);
  }
}
