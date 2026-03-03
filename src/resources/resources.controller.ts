import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { CreateResourceDto, UpdateResourceDto } from './dto/resource.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums/user-role.enum';

@ApiTags('resources')
@Controller('resources')
export class ResourcesController {
    constructor(private readonly resourcesService: ResourcesService) { }

    @Get()
    @ApiOperation({ summary: 'Get all resources' })
    findAll() {
        return this.resourcesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get resource by ID' })
    findOne(@Param('id') id: string) {
        return this.resourcesService.findOne(id);
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Get resource by slug' })
    findBySlug(@Param('slug') slug: string) {
        return this.resourcesService.findBySlug(slug);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SYSTEM_ADMIN, UserRole.MODERATOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new resource (Admin/Moderator only)' })
    create(@Body() createResourceDto: CreateResourceDto) {
        return this.resourcesService.create(createResourceDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SYSTEM_ADMIN, UserRole.MODERATOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a resource (Admin/Moderator only)' })
    update(@Param('id') id: string, @Body() updateResourceDto: UpdateResourceDto) {
        return this.resourcesService.update(id, updateResourceDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SYSTEM_ADMIN, UserRole.MODERATOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a resource (Admin/Moderator only)' })
    remove(@Param('id') id: string) {
        return this.resourcesService.remove(id);
    }
}
