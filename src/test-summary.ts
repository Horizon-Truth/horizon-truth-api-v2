import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_NAME || 'horizon_truth',
});

async function run() {
    await AppDataSource.initialize();
    const progressId = '3310f696-c4f4-41be-9f94-ef29f6d56da5';
    console.log(`Checking DB for progressId: ${progressId}`);

    const results = await AppDataSource.query(`SELECT id, user_id FROM game_progress WHERE id = $1`, [progressId]);
    console.log(results);

    if (results.length > 0) {
        const userId = results[0].user_id;
        console.log(`Checking outcomes for progressId: ${progressId} and userId: ${userId}`);
        const outcomes = await AppDataSource.query(`SELECT id, user_id, progress_id FROM game_outcomes WHERE progress_id = $1`, [progressId]);
        console.log('Outcomes:', outcomes);
    } else {
        console.log('Progress ID not found in database!');
    }

    await AppDataSource.destroy();
}

run().catch(console.error);
