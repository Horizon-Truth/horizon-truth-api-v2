import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Avatar } from './entities/avatar.entity';
import { PlayerProfile } from './entities/player-profile.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Avatar, PlayerProfile])],
    exports: [TypeOrmModule],
})
export class PlayersModule { }
