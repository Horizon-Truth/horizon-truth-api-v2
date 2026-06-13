import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Query,
    Delete,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { BlogsService } from './blogs.service';
import { CreateBlogDto, UpdateBlogDto } from './dto/blog.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums/user-role.enum';
import { ContentLanguage } from '../shared/enums/content-language.enum';

@ApiTags('blogs')
@Controller('blogs')
export class BlogsController {
    constructor(private readonly blogsService: BlogsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all blogs (optionally filtered by language)' })
    @ApiQuery({ name: 'language', enum: ContentLanguage, required: false })
    @ApiQuery({ name: 'search', required: false })
    findAll(
        @Query('language') language?: ContentLanguage,
        @Query('search') search?: string,
    ) {
        return this.blogsService.findAll({ language, search });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get blog by ID' })
    findOne(@Param('id') id: string) {
        return this.blogsService.findOne(id);
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Get blog by slug' })
    findBySlug(@Param('slug') slug: string) {
        return this.blogsService.findBySlug(slug);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SYSTEM_ADMIN, UserRole.MODERATOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new blog (Admin/Moderator only)' })
    create(@Body() createBlogDto: CreateBlogDto) {
        return this.blogsService.create(createBlogDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SYSTEM_ADMIN, UserRole.MODERATOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a blog (Admin/Moderator only)' })
    update(@Param('id') id: string, @Body() updateBlogDto: UpdateBlogDto) {
        return this.blogsService.update(id, updateBlogDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SYSTEM_ADMIN, UserRole.MODERATOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a blog (Admin/Moderator only)' })
    remove(@Param('id') id: string) {
        return this.blogsService.remove(id);
    }
}
