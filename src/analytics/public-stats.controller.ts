import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

/**
 * Public, unauthenticated headline stats for the marketing landing page.
 * Deliberately separate from AnalyticsController so it isn't behind the