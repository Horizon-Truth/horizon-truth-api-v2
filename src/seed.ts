import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GameSeederService } from './database/seeders/game-seeder.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);

    const seeder = app.get(GameSeederService);

    try {
        await seeder.seed();
        console.log('✅ Database seeding completed successfully!');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

bootstrap();
