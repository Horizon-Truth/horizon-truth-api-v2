import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserActivity } from './entities/user-activity.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserPreferencesDto } from './dto/user-preferences.dto';
import { IpPrivacyUtil } from '../shared/utils/ip-privacy.util';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { UserStatus } from '../shared/enums/user-status.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserActivity)
    private activityRepository: Repository<UserActivity>,
    @InjectRepository(PlayerProfile)
    private playerProfileRepository: Repository<PlayerProfile>,
  ) { }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['playerProfile', 'playerProfile.avatar'],
      select: [
        'id',