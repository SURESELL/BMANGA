import { getEnv } from "@/lib/env";

export interface FeatureFlags {
  aiText: boolean;
  aiImage: boolean;
  aiTts: boolean;
  shortFactory: boolean;
  linkedin: boolean;
  facebook: boolean;
  instagram: boolean;
  tiktok: boolean;
  youtube: boolean;
  analytics: boolean;
  affiliateTracking: boolean;
}

export function getFeatureFlags(): FeatureFlags {
  const env = getEnv();
  return {
    aiText: env.FEATURE_AI_TEXT && env.TEXT_AI_PROVIDER !== "",
    aiImage: env.FEATURE_AI_IMAGE && env.IMAGE_AI_PROVIDER !== "",
    aiTts: env.FEATURE_AI_TTS && env.TTS_PROVIDER !== "",
    shortFactory: env.FEATURE_SHORT_FACTORY,
    linkedin: env.FEATURE_LINKEDIN && env.LINKEDIN_CLIENT_ID !== "",
    facebook: env.FEATURE_FACEBOOK && env.FACEBOOK_APP_ID !== "",
    instagram: env.FEATURE_INSTAGRAM && env.INSTAGRAM_APP_ID !== "",
    tiktok: env.FEATURE_TIKTOK && env.TIKTOK_CLIENT_KEY !== "",
    youtube: env.FEATURE_YOUTUBE && env.YOUTUBE_CLIENT_ID !== "",
    analytics: env.FEATURE_ANALYTICS,
    affiliateTracking: env.FEATURE_AFFILIATE_TRACKING,
  };
}
