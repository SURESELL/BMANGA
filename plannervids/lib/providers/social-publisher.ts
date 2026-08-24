import type { SocialPlatform } from "@/prisma/generated/client";

export interface PublishRequest {
  socialAccountId: string;
  idempotencyKey: string;
  text?: string;
  mediaUrls: string[];
  link?: string;
}

export interface PublishResult {
  providerPostId: string;
  providerUrl?: string;
  rawResponse: unknown;
}

export interface PublisherError {
  code: string;
  message: string;
  retryable: boolean;
}

// One implementation per platform (LinkedInPublisher, FacebookPublisher, ...).
// Every implementation MUST:
//  - use only the platform's official API (never scraping)
//  - honor the idempotencyKey: check for an existing PlatformPost before
//    creating a new one when a prior attempt's outcome is ambiguous
//  - never report success without a real provider post id
//  - surface structured, typed errors (PublisherError), not generic throws
export interface SocialPublisher {
  readonly platform: SocialPlatform;
  readonly isConfigured: boolean;
  validate(req: PublishRequest): Promise<{ valid: boolean; errors: string[] }>;
  publish(req: PublishRequest): Promise<PublishResult>;
  fetchStatus(providerPostId: string): Promise<{ status: string; raw: unknown }>;
}

export class NotAuditedError extends Error {
  constructor(platform: string, detail: string) {
    super(`${platform} publisher not available: ${detail}`);
    this.name = "NotAuditedError";
  }
}
