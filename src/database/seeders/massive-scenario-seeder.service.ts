import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { Scenario } from '../../engine/entities/scenario.entity';
import { Scene } from '../../engine/entities/scene.entity';
import { SceneContent } from '../../engine/entities/scene-content.entity';
import { GameLevel } from '../../engine/entities/game-level.entity';
import { PlayerChoice } from '../../engine/entities/player-choice.entity';
import { GameOutcome } from '../../engine/entities/game-outcome.entity';

@Injectable()
export class MassiveScenarioSeederService {
    private readonly logger = new Logger(MassiveScenarioSeederService.name);

    constructor(
        @InjectRepository(Scenario)
        private scenarioRepository: Repository<Scenario>,
        @InjectRepository(Scene)
        private sceneRepository: Repository<Scene>,
        @InjectRepository(SceneContent)
        private sceneContentRepository: Repository<SceneContent>,
        @InjectRepository(GameLevel)
        private gameLevelRepository: Repository<GameLevel>,
        @InjectRepository(PlayerChoice)
        private playerChoiceRepository: Repository<PlayerChoice>,
        @InjectRepository(GameOutcome)
        private gameOutcomeRepository: Repository<GameOutcome>,
    ) { }

    async seed() {
        this.logger.log('Starting massive scenario seeding (1000 items)...');

        try {
            // Path to the generated JSON file
            const jsonPath = path.join(
                process.cwd(), 'src', 'database', 'seeders', 'data', 'scenarios_1000_rich.json'
            );

            const fileContent = fs.readFileSync(jsonPath, 'utf8');
            const scenarios = JSON.parse(fileContent);

            this.logger.log(`Found ${scenarios.length} scenarios in JSON. Beginning import...`);

            // Due to the large volume, we process them in chunks or sequentially.
            // Doing them sequentially ensures we don't overwhelm connection pools.
            let count = 0;
            for (const data of scenarios) {
                await this.createScenario(data);
                count++;
                if (count % 50 === 0) {
                    this.logger.log(`Inserted ${count} / ${scenarios.length} scenarios...`);
                }
            }

            this.logger.log('Massive scenario seeding completed successfully!');
        } catch (error) {
            this.logger.error('Failed to run massive scenario seeder', error);
        }
    }

    private async createScenario(data: any) {
        let scenario = await this.scenarioRepository.findOne({
            where: { title: data.title },
        });

        const gameLevel = await this.gameLevelRepository.findOne({
            where: { levelNumber: data.levelNumber ?? 1 },
        });

        const totalPossibleScore = data.scenes.reduce((acc, scene) => {
            const maxImpact = scene.choices?.length ? Math.max(...scene.choices.map(c => c.scoreImpact || 0)) : 0;
            return acc + maxImpact;
        }, 0);

        const scenarioData = {
            title: data.title,
            description: data.description,
            scenarioType: data.scenarioType,
            difficulty: data.difficulty,
            gameLevelId: gameLevel?.id,
            isActive: true,
            learningObjective: data.learningObjective,
            behavioralRisk: data.behavioralRisk,
            psychologicalTrigger: data.psychologicalTrigger,
            preventionLesson: data.preventionLesson,
            theme: data.theme,
            minimumScore: data.minimumScore ?? 70,
            totalScenes: data.scenes.length,
            campaignTag: data.campaignTag ?? null,
            totalPossibleScore,
        };

        if (scenario) {
            Object.assign(scenario, scenarioData);
        } else {
            scenario = this.scenarioRepository.create(scenarioData);
        }

        const savedScenario = await this.scenarioRepository.save(scenario);

        // Handle unlock chain: if unlockAfterTitle is set, link it
        if (data.unlockAfterTitle) {
            const prereq = await this.scenarioRepository.findOne({
                where: { title: data.unlockAfterTitle },
            });
            if (prereq) {
                savedScenario.unlockScenarioId = prereq.id;
                await this.scenarioRepository.save(savedScenario);
            }
        }

        const sceneMap = new Map<string, string>(); // Title -> ID

        // Create/Update scenes
        for (const sceneData of data.scenes) {
            let scene = await this.sceneRepository.findOne({
                where: { scenarioId: savedScenario.id, title: sceneData.title },
            });

            const sceneValues = {
                scenarioId: savedScenario.id,
                title: sceneData.title,
                description: sceneData.description,
                order: sceneData.order,
                sceneType: sceneData.sceneType,
                contentType: sceneData.contentType,
                availableChoices: sceneData.availableChoices,
                isTerminal: sceneData.isTerminal || false,
                decisionTimeLimit: sceneData.decisionTimeLimit ?? null,
                sceneTypeLabel: sceneData.sceneTypeLabel ?? null,
            };

            if (scene) {
                Object.assign(scene, sceneValues);
            } else {
                scene = this.sceneRepository.create(sceneValues);
            }

            const savedScene = await this.sceneRepository.save(scene);
            sceneMap.set(sceneData.title, savedScene.id);

            // Create/Update scene content
            let content = await this.sceneContentRepository.findOne({
                where: { sceneId: savedScene.id },
            });

            const contentValues = {
                sceneId: savedScene.id,
                contentType: sceneData.contentType,
                ...sceneData.content,
            };

            if (content) {
                Object.assign(content, contentValues);
                await this.sceneContentRepository.save(content);
            } else {
                const newContent = this.sceneContentRepository.create(contentValues);
                await this.sceneContentRepository.save(newContent);
            }
        }

        // Create/Update choices and their outcomes
        for (const sceneData of data.scenes) {
            const currentSceneId = sceneMap.get(sceneData.title);
            if (!currentSceneId) continue;

            if (sceneData.choices) {
                for (const choiceData of sceneData.choices) {
                    let choice = await this.playerChoiceRepository.findOne({
                        where: { sceneId: currentSceneId, label: choiceData.label },
                    });

                    const choiceValues = {
                        sceneId: currentSceneId,
                        label: choiceData.label,
                        actionType: choiceData.actionType,
                        scoreImpact: choiceData.scoreImpact ?? 0,
                        influenceImpact: choiceData.influenceImpact ?? 0,
                        nextSceneId: choiceData.nextSceneTitle
                            ? sceneMap.get(choiceData.nextSceneTitle)
                            : undefined,
                        spreadSimulation: choiceData.spreadSimulation ?? null,
                        psychologicalTrap: choiceData.psychologicalTrap ?? null,
                    };

                    if (choice) {
                        Object.assign(choice, choiceValues);
                    } else {
                        choice = this.playerChoiceRepository.create(choiceValues);
                    }
                    const savedChoice = await this.playerChoiceRepository.save(choice);

                    if (choiceData.outcome) {
                        let outcome = await this.gameOutcomeRepository.findOne({
                            where: { playerChoiceId: savedChoice.id },
                        });

                        const outcomeValues = {
                            scenarioId: savedScenario.id,
                            playerChoiceId: savedChoice.id,
                            outcomeType: choiceData.outcome.outcomeType,
                            trustScoreDelta: choiceData.outcome.trustScoreDelta,
                            message: choiceData.outcome.message,
                            endScenario: choiceData.outcome.endScenario,
                            score: choiceData.outcome.score || 0,
                        };

                        if (outcome) {
                            Object.assign(outcome, outcomeValues);
                        } else {
                            outcome = this.gameOutcomeRepository.create(outcomeValues);
                        }
                        await this.gameOutcomeRepository.save(outcome);
                    }
                }
            }
        }
    }
}
