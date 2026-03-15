import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PlayersService } from './players.service';
import { CreatePlayerProfileDto } from './dto/create-player-profile.dto';