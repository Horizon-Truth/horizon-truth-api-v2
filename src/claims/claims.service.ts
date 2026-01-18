import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Claim } from './entities/claim.entity';

@Injectable()
export class ClaimsService {
    constructor(
        @InjectRepository(Claim)
        private claimsRepository: Repository<Claim>,
    ) { }

    async create(claimData: any): Promise<Claim> {
        const claim = this.claimsRepository.create(claimData);
        return this.claimsRepository.save(claim) as unknown as Promise<Claim>;
    }

    async findAll(): Promise<Claim[]> {
        return this.claimsRepository.find({
            relations: ['submitter'],
        });
    }
}
