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
import { LanguagesService } from './languages.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Languages')
@Controller('languages')
export class LanguagesController {
    constructor(private readonly languagesService: LanguagesService) { }

    @Get()
    @ApiOperation({ summary: 'Get all available languages' })
    findAll(@Query() query: any) {
        return this.languagesService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a language by ID' })
    findOne(@Param('id') id: string) {
        return this.languagesService.findById(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new language' })
    create(@Body() createLanguageDto: CreateLanguageDto) {
        return this.languagesService.create(createLanguageDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a language' })
    update(@Param('id') id: string, @Body() updateLanguageDto: UpdateLanguageDto) {
        return this.languagesService.update(id, updateLanguageDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a language' })
    remove(@Param('id') id: string) {
        return this.languagesService.delete(id);
    }
}
