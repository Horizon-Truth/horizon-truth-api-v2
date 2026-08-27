import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserActivity } from './entities/user-activity.entity';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserInvitationsService } from './user-invitations.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserActivity, PlayerProfile]),
    MailModule,
    // UserInvitationsService injects ConfigService, and ConfigModule is not
    // registered globally in this app.
    ConfigModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UserInvitationsService],
  exports: [UsersService, UserInvitationsService],
})
export class UsersModule {}
