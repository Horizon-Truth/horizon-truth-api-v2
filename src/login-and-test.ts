import { DataSource } from 'typeorm';
import * as jwt from 'jsonwebtoken';

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

    try {
        const progressId = '3310f696-c4f4-41be-9f94-ef29f6d56da5';
        const res = await AppDataSource.query(`SELECT user_id FROM game_progress WHERE id = $1`, [progressId]);
        if (res.length === 0) return;
        const userId = res[0].user_id;

        // Create a forged valid token for this user
        const payload = { sub: userId };