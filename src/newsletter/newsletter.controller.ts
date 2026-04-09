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