import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(2),
  companyKey: z.string().min(2), // maps to backend/data/<companyKey>.sources.json
  loanAmount: z.number().positive().default(1),
});

export const simulateSchema = z.object({
  loanAmount: z.number().positive(),
});
