import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportTagsService } from './report-tags.service';
import { CreateReportTagDto } from './dto/create-report-tag.dto';
import { UpdateReportTagDto } from './dto/update-report-tag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Report Tags')
@Controller('report-tags')
export class ReportTagsController {
    constructor(private readonly reportTagsService: ReportTagsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all report tags' })
    findAll(@Query() query: any) {
        return this.reportTagsService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a report tag by ID' })
    findOne(@Param('id') id: string) {
        return this.reportTagsService.findById(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new report tag' })
    create(@Body() createReportTagDto: CreateReportTagDto) {
        return this.reportTagsService.create(createReportTagDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a report tag' })
    update(@Param('id') id: string, @Body() updateReportTagDto: UpdateReportTagDto) {
        return this.reportTagsService.update(id, updateReportTagDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a report tag' })
    remove(@Param('id') id: string) {
        return this.reportTagsService.delete(id);
    }
}
