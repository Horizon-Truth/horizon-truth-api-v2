import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GameSeederService } from './database/seeders/game-seeder.service';
import { SystemSeederService } from './database/seeders/system-seeder.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);

    const gameSeeder = app.get(GameSeederService);
    const systemSeeder = app.get(SystemSeederService);

    try {
        console.log('--- Starting System Seeding ---');
        await systemSeeder.seed();

        console.log('--- Starting Game Data Seeding ---');
        await gameSeeder.seed();

        console.log('✅ All database seeding completed successfully!');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

bootstrap();
