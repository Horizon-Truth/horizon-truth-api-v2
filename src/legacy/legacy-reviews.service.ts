import { Injectable } from '@nestjs/common';

@Injectable()
export class LegacyReviewsService {
  getPending(): unknown[] {
    return [];
  }
}
