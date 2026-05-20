import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NewsletterService } from './newsletter.service';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { Newsletter } from './entities/newsletter.entity';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
    constructor(private readonly newsletterService: NewsletterService) { }

    @Public()
    @Post()
    @ApiOperation({ summary: 'Subscribe to newsletter' })
    @ApiResponse({ status: 201, description: 'The email has been successfully subscribed.', type: Newsletter })
    create(@Body() createNewsletterDto: CreateNewsletterDto) {
        return this.newsletterService.create(createNewsletterDto);
    }

    @ApiBearerAuth()
    @Roles(UserRole.SYSTEM_ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Get()
    @ApiOperation({ summary: 'Get all newsletter subscriptions (Admin only)' })
    @ApiResponse({ status: 200, description: 'Return all newsletter subscriptions.', type: [Newsletter] })
    findAll() {
        return this.newsletterService.findAll();
    }

    @ApiBearerAuth()
    @Roles(UserRole.SYSTEM_ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a newsletter subscription (Admin only)' })
    @ApiResponse({ status: 200, description: 'The subscription has been successfully deleted.' })
    remove(@Param('id') id: string) {
        return this.newsletterService.remove(id);
    }
}
