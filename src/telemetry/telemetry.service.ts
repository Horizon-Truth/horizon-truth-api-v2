import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionContext } from './entities/session-context.entity';
import { DecisionOutcome } from './entities/decision-outcome.entity';
import { SocialContextExposure } from './entities/social-context-exposure.entity';