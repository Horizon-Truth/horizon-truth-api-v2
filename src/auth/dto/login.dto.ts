import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const LoginSchema = z.object({
    email: z.string().min(1, 'Email or Username is required'),
    password: z.string().min(1, 'Password is required'),
});

export class LoginDto extends createZodDto(LoginSchema) { }
