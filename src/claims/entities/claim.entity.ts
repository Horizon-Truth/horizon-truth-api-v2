import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Review } from '../../reviews/entities/review.entity';

export enum ClaimStatus {
    UNVERIFIED = 'UNVERIFIED',
    VERIFIED_TRUE = 'VERIFIED_TRUE',
    VERIFIED_FALSE = 'VERIFIED_FALSE',
    DEBUNKED = 'DEBUNKED',
}

@Entity()
export class Claim {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    content: string;

    @Column({ nullable: true })
    sourceUrl: string;

    @Column({
        type: 'simple-enum',
        enum: ClaimStatus,
        default: ClaimStatus.UNVERIFIED,
    })
    status: ClaimStatus;

    @ManyToOne(() => User, (user) => user.claims)
    submitter: User;

    @OneToMany(() => Review, (review) => review.claim)
    reviews: Review[];
}
