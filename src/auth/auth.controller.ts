import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
  Param,
  Ip,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 300000 } }) // 10 requests per 5 minutes
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 429, description: 'Too Many Requests.' })
  async register(
    @Body() registerDto: RegisterDto,
    @Request() req,
    @Ip() ip: string,
  ) {
    try {
      const user = await this.usersService.create(registerDto);
      const userAgent = req.headers['user-agent'];
      return this.authService.login(user, ip, userAgent);