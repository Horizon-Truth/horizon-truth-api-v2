import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SystemSeederService } from './database/seeders/system-seeder.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const systemSeeder = app.get(SystemSeederService);

  try {
    console.log('--- Starting Super Admin Seeding ---');
    await systemSeeder.seed();
    console.log('✅ Super admin seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding super admin:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
