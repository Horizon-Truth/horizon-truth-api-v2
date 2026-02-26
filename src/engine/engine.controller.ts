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
import { normalizeLanguage } from '../shared/enums/content-language.enum';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('Game Engine')
@Controller('engine')
export class EngineController {