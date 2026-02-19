import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameSeederService } from './game-seeder.service';
import { SystemSeederService } from './system-seeder.service';
import { ReportsSeederService } from './reports-seeder.service';
import { User } from '../../users/entities/user.entity';
import { Scenario } from '../../engine/entities/scenario.entity';