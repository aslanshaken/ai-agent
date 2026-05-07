import { z } from "zod";

export const createTaskNodeDataSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(8000).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  due_date: z.string().max(40).optional(),
});

export const saveInvestorNodeDataSchema = z.object({
  name: z.string().min(1).max(300),
  fund: z.string().max(300).optional(),
  focus: z.string().max(500).optional(),
  stage: z.string().max(120).optional(),
  location: z.string().max(200).optional(),
  linkedin_url: z.string().max(500).optional(),
  website: z.string().max(500).optional(),
  score: z.number().optional(),
  reason: z.string().max(8000).optional(),
  status: z.string().max(80).optional(),
});

export const saveCandidateNodeDataSchema = z.object({
  name: z.string().min(1).max(300),
  role: z.string().max(300).optional(),
  skills: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  linkedin_url: z.string().max(500).optional(),
  github_url: z.string().max(500).optional(),
  score: z.number().optional(),
  reason: z.string().max(8000).optional(),
  status: z.string().max(80).optional(),
});

export const saveCompanyNodeDataSchema = z.object({
  name: z.string().min(1).max(300),
  industry: z.string().max(200).optional(),
  website: z.string().max(500).optional(),
  description: z.string().max(8000).optional(),
  score: z.number().optional(),
  notes: z.string().max(8000).optional(),
});
