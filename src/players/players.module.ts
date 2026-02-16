import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Avatar } from './entities/avatar.entity';
import { PlayerProfile } from './entities/player-profile.entity';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Avatar, PlayerProfile])],
    controllers: [PlayersController],
    providers: [PlayersService],
    exports: [PlayersService, TypeOrmModule],
})
export class PlayersModule { }

