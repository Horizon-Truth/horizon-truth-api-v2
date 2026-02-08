import { Controller, Get, UseGuards, Request, Put, Body, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Return current user profile.' })
    getProfile(@Request() req) {
        return req.user;
    }

    @UseGuards(JwtAuthGuard)
    @Put('profile')
    @ApiOperation({ summary: 'Update user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated.' })
    async updateProfile(@Request() req, @Body() updateData: any) {
        return this.usersService.update(req.user.userId, updateData);
    }

    @UseGuards(JwtAuthGuard) // TODO: Add Roles Guard
    @Get()
    @ApiOperation({ summary: 'List users' })
    async findAll(@Query() query: any) {
        return this.usersService.findAll(query);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    @ApiOperation({ summary: 'Get user details' })
    async findOne(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @UseGuards(JwtAuthGuard) // TODO: Add Roles Guard
    @Put(':id/status')
    @ApiOperation({ summary: 'Update user status' })
    async updateStatus(@Param('id') id: string, @Body('status') status: string) {
        return this.usersService.update(id, { status: status as any });
    }
}
