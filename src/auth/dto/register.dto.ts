import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RegisterSchema = z.object({
    email: z.string().email().optional().or(z.literal('')),
    username: z.string().min(3).max(20).optional().or(z.literal('')),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    fullName: z.string().min(2),
}).refine(data => data.email || data.username, {
    message: "Either email or username must be provided",
    path: ["email"]
});

export class RegisterDto extends createZodDto(RegisterSchema) { }
