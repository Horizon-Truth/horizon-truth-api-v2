import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameLevel } from './entities/game-level.entity';
import { Scenario } from './entities/scenario.entity';
import { Scene } from './entities/scene.entity';