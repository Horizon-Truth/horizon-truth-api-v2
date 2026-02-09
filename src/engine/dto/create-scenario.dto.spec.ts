import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateScenarioDto } from './create-scenario.dto';
import { ScenarioType } from '../../shared/enums/scenario-type.enum';
import { ScenarioDifficulty } from '../../shared/enums/scenario-difficulty.enum';
import { ContentLanguage } from '../../shared/enums/content-language.enum';

const base = {