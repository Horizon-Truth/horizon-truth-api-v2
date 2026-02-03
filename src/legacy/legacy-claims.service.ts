import { Injectable } from '@nestjs/common';

@Injectable()
export class LegacyClaimsService {
  validate(claim: unknown): boolean {
    return Boolean(claim);
  }
}
