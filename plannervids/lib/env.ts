import { z } from "zod";

const boolFromString = z
  .string()
  .optional()
  .transform((v) => v === "true")
  .default("false");

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  APP_URL: z.string().url().default("http://localhost:3100"),
  CREDENTIALS_ENCRYPTION_KEY: z
    .string()
    .min(1, "CREDENTIALS_ENCRYPTION_KEY is required to store social OAuth tokens safely"),
  DEFAULT_TIMEZONE: z.string().default("Europe/Paris"),

  TEXT_AI_PROVIDER: z.string().optional().default(""),
  TEXT_AI_API_KEY: z.string().optional().default(""),
  IMAGE_AI_PROVIDER: z.string().optional().default(""),
  IMAGE_AI_API_KEY: z.string().optional().default(""),
  TTS_PROVIDER: z.string().optional().default(""),
  TTS_API_KEY: z.string().optional().default(""),
  VIDEO_PROVIDER: z.enum(["template", "external_generative"]).default("template"),

  STORAGE_PROVIDER: z.string().optional().default(""),
  STORAGE_BUCKET: z.string().optional().default(""),
  STORAGE_REGION: z.string().optional().default("auto"),
  STORAGE_ACCESS_KEY: z.string().optional().default(""),
  STORAGE_SECRET_KEY: z.string().optional().default(""),
  STORAGE_ENDPOINT: z.string().optional().default(""),
  STORAGE_PUBLIC_URL: z.string().optional().default(""),

  LINKEDIN_CLIENT_ID: z.string().optional().default(""),
  LINKEDIN_CLIENT_SECRET: z.string().optional().default(""),
  FACEBOOK_APP_ID: z.string().optional().default(""),
  FACEBOOK_APP_SECRET: z.string().optional().default(""),
  INSTAGRAM_APP_ID: z.string().optional().default(""),
  INSTAGRAM_APP_SECRET: z.string().optional().default(""),
  TIKTOK_CLIENT_KEY: z.string().optional().default(""),
  TIKTOK_CLIENT_SECRET: z.string().optional().default(""),
  YOUTUBE_CLIENT_ID: z.string().optional().default(""),
  YOUTUBE_CLIENT_SECRET: z.string().optional().default(""),

  AI_MONTHLY_BUDGET_CENTS: z.coerce.number().int().positive().default(2000),

  FEATURE_AI_TEXT: boolFromString,
  FEATURE_AI_IMAGE: boolFromString,
  FEATURE_AI_TTS: boolFromString,
  FEATURE_SHORT_FACTORY: boolFromString,
  FEATURE_LINKEDIN: boolFromString,
  FEATURE_FACEBOOK: boolFromString,
  FEATURE_INSTAGRAM: boolFromString,
  FEATURE_TIKTOK: boolFromString,
  FEATURE_YOUTUBE: boolFromString,
  FEATURE_ANALYTICS: boolFromString,
  FEATURE_AFFILIATE_TRACKING: boolFromString,

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

// Parsed lazily (not at import time) so tooling like `next lint` that loads
// this module without a populated process.env doesn't crash the whole run.
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${parsed.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`
    );
  }
  cached = parsed.data;
  return cached;
}
