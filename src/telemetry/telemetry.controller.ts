import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { CreateTelemetryPayloadDto } from './dto/create-telemetry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';