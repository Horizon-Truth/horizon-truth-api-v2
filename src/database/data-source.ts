import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * Standalone TypeORM DataSource used exclusively by the migration CLI
 * (`npm run migration:run` / `migration:revert`). The running application
 * configures its own connection in `app.module.ts`.
 *
 * `synchronize` is intentionally OFF here so schema changes only ever flow
 * through reviewed migration files.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
