import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ReplyContactDto } from './dto/reply-contact.dto';
import { Contact } from './entities/contact.entity';
import { ContactReply } from './entities/contact-reply.entity';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 per 5 min
  @Post()
  @ApiOperation({ summary: 'Submit a contact form' })
  @ApiResponse({
    status: 201,
    description: 'The contact form has been successfully submitted.',
    type: Contact,
  })
  create(@Body() createContactDto: CreateContactDto) {
    return this.contactsService.create(createContactDto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.SYSTEM_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  @ApiOperation({ summary: 'Get all contact submissions (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Return all contact submissions.',
    type: [Contact],
  })
  findAll() {
    return this.contactsService.findAll();
  }

  @ApiBearerAuth()
  @Roles(UserRole.SYSTEM_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get a single contact submission (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Return a single contact submission.',
    type: Contact,
  })
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.SYSTEM_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a contact submission as read (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'The submission has been marked as read.',
    type: Contact,
  })
  markAsRead(@Param('id') id: string) {
    return this.contactsService.markAsRead(id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.SYSTEM_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/reply')
  @ApiOperation({
    summary: 'Reply to a contact submission by email (Admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'The reply has been sent and recorded.',
    type: ContactReply,
  })
  reply(
    @Param('id') id: string,
    @Body() replyContactDto: ReplyContactDto,
    @Request() req,
  ) {
    return this.contactsService.reply(id, replyContactDto, {
      userId: req.user?.userId ?? null,
      email: req.user?.email,
    });
  }

  @ApiBearerAuth()
  @Roles(UserRole.SYSTEM_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contact submission (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'The contact submission has been successfully deleted.',
  })
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}
