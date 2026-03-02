import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GameSeederService } from './database/seeders/game-seeder.service';
import { SystemSeederService } from './database/seeders/system-seeder.service';
import { ReportsSeederService } from './database/seeders/reports-seeder.service';
import { BlogResourceSeederService } from './database/seeders/blog-resource-seeder.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const gameSeeder = app.get(GameSeederService);
  const systemSeeder = app.get(SystemSeederService);
  const reportsSeeder = app.get(ReportsSeederService);
  const blogResourceSeeder = app.get(BlogResourceSeederService);

  try {
    console.log('--- Starting System Seeding ---');
    await systemSeeder.seed();

    console.log('--- Starting Game Data Seeding ---');
    await gameSeeder.seed();

    console.log('--- Starting Reports Data Seeding ---');
    await reportsSeeder.seed();

    console.log('--- Starting Blog and Resource Data Seeding ---');
    await blogResourceSeeder.seed();

    console.log('✅ All database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
