import { z } from "zod";

/** Minimal checks — Supabase enforces real rules. */
export const signInSchema = z.object({
  email: z.string().trim().min(1, "Enter your login.").max(320),
  password: z.string().trim().min(1, "Enter your password.").max(200),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  email: z.string().trim().min(1, "Enter your login.").max(320),
  password: z.string().trim().min(1, "Choose a password.").max(200),
});
