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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Submit a new report' })
    create(@Body() createReportDto: CreateReportDto, @Request() req: any) {
        return this.reportsService.create(createReportDto, req.user.userId);
    }

    @Get()
    @ApiOperation({ summary: 'Get all reports' })
    findAll(@Query() query: any) {
        return this.reportsService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a report by ID' })
    findOne(@Param('id') id: string) {
        return this.reportsService.findById(id);
    }
}
