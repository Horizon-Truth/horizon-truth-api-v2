import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { Scenario } from './engine/entities/scenario.entity';

async function clearBadScenarios() {
    const app = await NestFactory.createApplicationContext(AppModule);
    try {
        const dataSource = app.get(DataSource);
        console.log('Running raw SQL delete on scenarios...');
        // We will delete where campaign_tag IN ('MASSIVE_1000', 'ADVANCED_STORY_1000')
        const scenarioRepo = dataSource.getRepository(Scenario);
        console.log('Fetching all scenarios to delete using TypeORM...');
        const scenarios = await scenarioRepo.find({
            where: [
                { campaignTag: 'MASSIVE_1000' },
                { campaignTag: 'ADVANCED_STORY_1000' }
            ]
        });

        console.log(`Found ${scenarios.length} scenarios. Deleting them using parameterized raw queries...`);
        const scenarioIds = scenarios.map(s => s.id);
        if (scenarioIds.length > 0) {
            await dataSource.query(`DELETE FROM game_outcomes WHERE scenario_id = ANY($1)`, [scenarioIds]);
            await dataSource.query(`DELETE FROM player_choices WHERE scene_id IN (SELECT id FROM scenes WHERE scenario_id = ANY($1))`, [scenarioIds]);
            await dataSource.query(`DELETE FROM scene_content WHERE scene_id IN (SELECT id FROM scenes WHERE scenario_id = ANY($1))`, [scenarioIds]);
            await dataSource.query(`DELETE FROM scenes WHERE scenario_id = ANY($1)`, [scenarioIds]);
            await dataSource.query(`DELETE FROM scenarios WHERE id = ANY($1)`, [scenarioIds]);
        }

        console.log('Deletion complete.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await app.close();
    }
}

clearBadScenarios();
