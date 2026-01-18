import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { MultiAuthGuard } from '../auth/guards/auth.guard';
import { ClaimsService } from './claims.service';

@Controller('claims')
export class ClaimsController {
    constructor(private readonly claimsService: ClaimsService) { }

    @UseGuards(MultiAuthGuard)
    @Post()
    async create(@Body() createClaimDto: any, @Request() req: any) {
        return this.claimsService.create({
            ...createClaimDto,
            submitterId: req.user.id || req.user.userId,
        });
    }

    @Get()
    async findAll() {
        return this.claimsService.findAll();
    }
}
