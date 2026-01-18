import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Claim } from '../../claims/entities/claim.entity';
import { Review } from '../../reviews/entities/review.entity';

export enum UserRole {
    ADMIN = 'ADMIN',
    MODERATOR = 'MODERATOR',
    USER = 'USER',
}

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ select: false })
    password: string;

    @Column({ unique: true, nullable: true })
    apiKey: string;

    @Column()
    name: string;

    @Column({
        type: 'simple-enum',
        enum: UserRole,
        default: UserRole.USER,
    })
    role: UserRole;

    @Column({ default: 0 })
    reputationScore: number;

    @OneToMany(() => Claim, (claim) => claim.submitter)
    claims: Claim[];

    @OneToMany(() => Review, (review) => review.reviewer)
    reviews: Review[];
}
