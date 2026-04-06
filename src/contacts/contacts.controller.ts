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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ReplyContactDto } from './dto/reply-contact.dto';
import { Contact } from './entities/contact.entity';
import { ContactReply } from './entities/contact-reply.entity';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';