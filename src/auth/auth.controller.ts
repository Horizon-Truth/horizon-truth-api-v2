import { Controller, Post, Get, Delete, Body, UnauthorizedException, HttpException, HttpStatus, UseGuards, Request, Param, Ip } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private usersService: UsersService,
    ) { }

    @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User successfully registered.' })
    @ApiResponse({ status: 400, description: 'Bad Request.' })
    @ApiResponse({ status: 429, description: 'Too Many Requests.' })
    async register(@Body() registerDto: RegisterDto, @Request() req, @Ip() ip: string) {
        try {
            const user = await this.usersService.create(registerDto);
            const userAgent = req.headers['user-agent'];
            return this.authService.login(user, ip, userAgent);
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(error.message || 'Registration failed', HttpStatus.BAD_REQUEST);
        }
    }

    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
    @Post('login')
    @ApiOperation({ summary: 'Login user' })
    @ApiResponse({ status: 200, description: 'User successfully logged in.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 429, description: 'Too Many Requests.' })
    async login(@Body() loginDto: LoginDto, @Request() req, @Ip() ip: string) {
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const userAgent = req.headers['user-agent'];
        return this.authService.login(user, ip, userAgent);
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @ApiOperation({ summary: 'Logout user' })
    @ApiResponse({ status: 200, description: 'User successfully logged out.' })
    async logout(@Request() req) {
        await this.authService.logout(req.user.userId); // JwtStrategy returns userId
        return { message: 'Logged out successfully' };
    }

    // @UseGuards(RefreshTokenGuard) // TODO: Create wrapper guard
    @UseGuards(AuthGuard('jwt-refresh'))
    @Post('refresh')
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({ status: 200, description: 'Tokens refreshed.' })
    async refreshTokens(@Request() req, @Ip() ip: string) {
        const userId = req.user.userId;
        const refreshToken = req.user['refreshToken'];
        const userAgent = req.headers['user-agent'];
        return this.authService.refreshTokens(userId, refreshToken, ip, userAgent);
    }

    @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
    @Post('forgot-password')
    @ApiOperation({ summary: 'Request password reset' })
    @ApiResponse({ status: 429, description: 'Too Many Requests.' })
    async forgotPassword(@Body('email') email: string) {
        return this.authService.forgotPassword(email);
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Reset password with token' })
    async resetPassword(@Body() body: any) {
        return this.authService.resetPassword(body.token, body.new_password);
    }

    // Session Management Endpoints

    @UseGuards(JwtAuthGuard)
    @Get('sessions')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user active sessions' })
    @ApiResponse({ status: 200, description: 'List of active sessions.' })
    async getSessions(@Request() req) {
        const sessions = await this.authService.getUserSessions(req.user.userId);
        // Don't expose refresh token hashes
        return sessions.map(session => ({
            id: session.id,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
        }));
    }

    @UseGuards(JwtAuthGuard)
    @Delete('sessions/:id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Revoke a specific session' })
    @ApiResponse({ status: 200, description: 'Session revoked successfully.' })
    async revokeSession(@Request() req, @Param('id') sessionId: string) {
        await this.authService.revokeSession(req.user.userId, sessionId);
        return { message: 'Session revoked successfully' };
    }

    @UseGuards(JwtAuthGuard)
    @Delete('sessions')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Revoke all sessions (except current)' })
    @ApiResponse({ status: 200, description: 'All sessions revoked successfully.' })
    async revokeAllSessions(@Request() req) {
        await this.authService.revokeAllSessions(req.user.userId);
        return { message: 'All sessions revoked successfully' };
    }
}
