import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().optional(),

  AI_PROVIDER: z.enum(["mock", "openai"]).default("mock"),

  OPENAI_API_KEY: z.string().optional(),

  OPENAI_MODEL: z.string().default("gpt-5.6-mini"),

  JWT_SECRET: z.string().min(16),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

export const env = schema.parse(process.env);
