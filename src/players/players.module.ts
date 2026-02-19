import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Avatar } from './entities/avatar.entity';
import { PlayerProfile } from './entities/player-profile.entity';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';
import { AdminPlayersController } from './admin-players.controller';
import { PlayerAlgorithmProfile } from '../analytics/entities/player-algorithm-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Avatar, PlayerProfile, PlayerAlgorithmProfile])],
  controllers: [PlayersController, AdminPlayersController],
  providers: [PlayersService],
  exports: [PlayersService, TypeOrmModule],
})
export class PlayersModule { }
