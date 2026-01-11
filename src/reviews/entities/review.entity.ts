import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Claim } from '../../claims/entities/claim.entity';

export enum ReviewVerdict {
    TRUE = 'TRUE',
    FALSE = 'FALSE',
    UNSURE = 'UNSURE',
}

@Entity()
export class Review {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Claim, (claim) => claim.reviews)
    claim: Claim;

    @ManyToOne(() => User, (user) => user.reviews)
    reviewer: User;

    @Column({
        type: 'simple-enum',
        enum: ReviewVerdict,
    })
    verdict: ReviewVerdict;

    @Column({ nullable: true })
    evidenceUrl: string;

    @Column('text', { nullable: true })
    notes: string;
}
