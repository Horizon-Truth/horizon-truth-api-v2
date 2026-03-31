import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SystemSeederService } from './database/seeders/system-seeder.service';

async function bootstrap() {