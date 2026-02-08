import { Controller, Get, UseGuards, Request, Put, Body, Query, Param, Delete, Patch, Ip } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums/user-role.enum';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserPreferencesDto } from './dto/user-preferences.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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
    @Put('me/profile')
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
    @ApiResponse({ status: 400, description: 'Bad Request - Username already exists.' })
    async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
        const updatedUser = await this.usersService.updateProfile(req.user.userId, updateDto);
        await this.usersService.logActivity(req.user.userId, 'PROFILE_UPDATE', { updates: Object.keys(updateDto) }, req.ip, req.headers['user-agent']);
        return updatedUser;
    }

    @UseGuards(JwtAuthGuard)
    @Get('me/preferences')
    @ApiOperation({ summary: 'Get current user preferences' })
    @ApiResponse({ status: 200, description: 'User preferences retrieved.' })
    async getPreferences(@Request() req) {
        return this.usersService.getPreferences(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Put('me/preferences')
    @ApiOperation({ summary: 'Update user preferences' })
    @ApiResponse({ status: 200, description: 'Preferences updated successfully.' })
    async updatePreferences(@Request() req, @Body() preferencesDto: UserPreferencesDto) {
        return this.usersService.updatePreferences(req.user.userId, preferencesDto);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('me/password')
    @ApiOperation({ summary: 'Change password' })
    @ApiResponse({ status: 200, description: 'Password changed successfully.' })
    @ApiResponse({ status: 401, description: 'Current password is incorrect.' })
    async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
        await this.usersService.changePassword(
            req.user.userId,
            changePasswordDto.currentPassword,
            changePasswordDto.newPassword
        );
        await this.usersService.logActivity(req.user.userId, 'PASSWORD_CHANGE', {}, req.ip, req.headers['user-agent']);
        return { message: 'Password changed successfully' };
    }

    @UseGuards(JwtAuthGuard)
    @Get('me/activity')
    @ApiOperation({ summary: 'Get user activity history' })
    @ApiResponse({ status: 200, description: 'Activity history retrieved.' })
    async getActivityHistory(@Request() req, @Query('page') page?: number, @Query('limit') limit?: number) {
        return this.usersService.getActivityHistory(req.user.userId, page || 1, limit || 20);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('me')
    @ApiOperation({ summary: 'Delete own account (soft delete)' })
    @ApiResponse({ status: 200, description: 'Account deleted successfully.' })
    async deleteOwnAccount(@Request() req) {
        await this.usersService.softDelete(req.user.userId);
        await this.usersService.logActivity(req.user.userId, 'ACCOUNT_DELETED', {}, req.ip, req.headers['user-agent']);
        return { message: 'Account deleted successfully. Contact admin to restore.' };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SYSTEM_ADMIN)
    @Delete(':id')
    @ApiOperation({ summary: 'Hard delete user (SYSTEM_ADMIN only)' })
    @ApiResponse({ status: 200, description: 'User permanently deleted.' })
    async hardDeleteUser(@Param('id') id: string) {
        await this.usersService.hardDelete(id);
        return { message: 'User permanently deleted' };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SYSTEM_ADMIN)
    @Put(':id/restore')
    @ApiOperation({ summary: 'Restore soft-deleted user (SYSTEM_ADMIN only)' })
    @ApiResponse({ status: 200, description: 'User restored successfully.' })
    async restoreUser(@Param('id') id: string) {
        await this.usersService.restoreUser(id);
        return { message: 'User restored successfully' };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.MODERATOR, UserRole.SYSTEM_ADMIN)
    @Get(':id/activity')
    @ApiOperation({ summary: 'Get any user activity history (MODERATOR/ADMIN only)' })
    @ApiResponse({ status: 200, description: 'Activity history retrieved.' })
    async getUserActivity(@Param('id') id: string, @Query('page') page?: number, @Query('limit') limit?: number) {
        return this.usersService.getActivityHistory(id, page || 1, limit || 20);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SYSTEM_ADMIN)
    @Get()
    @ApiOperation({ summary: 'List users (SYSTEM_ADMIN only)' })
    async findAll(@Query() query: any) {
        return this.usersService.findAll(query);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    @ApiOperation({ summary: 'Get user details' })
    async findOne(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SYSTEM_ADMIN)
    @Put(':id/status')
    @ApiOperation({ summary: 'Update user status (SYSTEM_ADMIN only)' })
    async updateStatus(@Param('id') id: string, @Body('status') status: string) {
        return this.usersService.update(id, { status: status as any });
    }
}
