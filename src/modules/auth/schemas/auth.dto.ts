import { z } from "zod";

export const LoginSchema = z.object({
  login: z.string().min(1).max(64),
  password: z.string().min(1).max(1024).meta({ writeOnly: true, format: "password" }),
}).strict();

export const AuthUserSchema = z.object({
  id: z.number().int().positive(),
  login: z.string(),
}).strict();

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("Bearer"),
  expires_in: z.literal(3600),
  user: AuthUserSchema,
}).strict();

export type LoginDTO = z.infer<typeof LoginSchema>;
export type AuthUserDTO = z.infer<typeof AuthUserSchema>;
export type LoginResponseDTO = z.infer<typeof LoginResponseSchema>;
