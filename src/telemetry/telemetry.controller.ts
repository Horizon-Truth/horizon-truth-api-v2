import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { CreateTelemetryPayloadDto } from './dto/create-telemetry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('Telemetry')
@Controller('telemetry')
export class TelemetryController {
    constructor(private readonly telemetryService: TelemetryService) { }

    @Post('record')
    @UseGuards(OptionalJwtAuthGuard)
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({ summary: 'Record batch telemetry from game session' })
    @ApiResponse({ status: 202, description: 'Telemetry recorded successfully' })
    async recordTelemetry(@Body() payload: CreateTelemetryPayloadDto) {
        // Process asynchronously to not block the frontend
        this.telemetryService.processTelemetryPayload(payload);
        return { success: true };
    }
}
