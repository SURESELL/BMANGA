import type { SocialPlatform } from "@/prisma/generated/client";

// Every metric is `number | null` — null means "unavailable from this
// platform's API for this object", never coerced to 0.
export interface PlatformMetrics {
  impressions: number | null;
  reach: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  followers: number | null;
}

export interface AnalyticsProvider {
  readonly platform: SocialPlatform;
  readonly isConfigured: boolean;
  fetchPostMetrics(providerPostId: string): Promise<PlatformMetrics>;
  fetchAccountMetrics(socialAccountId: string): Promise<Pick<PlatformMetrics, "followers">>;
}
