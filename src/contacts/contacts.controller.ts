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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { Contact } from './entities/contact.entity';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('contacts')
@Controller('contacts')
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) { }

    @Public()
    @Post()
    @ApiOperation({ summary: 'Submit a contact form' })
    @ApiResponse({ status: 201, description: 'The contact form has been successfully submitted.', type: Contact })
    create(@Body() createContactDto: CreateContactDto) {
        return this.contactsService.create(createContactDto);
    }

    @ApiBearerAuth()
    @Roles(UserRole.SYSTEM_ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Get()
    @ApiOperation({ summary: 'Get all contact submissions (Admin only)' })
    @ApiResponse({ status: 200, description: 'Return all contact submissions.', type: [Contact] })
    findAll() {
        return this.contactsService.findAll();
    }

    @ApiBearerAuth()
    @Roles(UserRole.SYSTEM_ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Get(':id')
    @ApiOperation({ summary: 'Get a single contact submission (Admin only)' })
    @ApiResponse({ status: 200, description: 'Return a single contact submission.', type: Contact })
    findOne(@Param('id') id: string) {
        return this.contactsService.findOne(id);
    }

    @ApiBearerAuth()
    @Roles(UserRole.SYSTEM_ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a contact submission (Admin only)' })
    @ApiResponse({ status: 200, description: 'The contact submission has been successfully deleted.' })
    remove(@Param('id') id: string) {
        return this.contactsService.remove(id);
    }
}
