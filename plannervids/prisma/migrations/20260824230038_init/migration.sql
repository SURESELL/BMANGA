-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'X', 'PINTEREST', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS');

-- CreateEnum
CREATE TYPE "SocialAccountStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'TOKEN_EXPIRING', 'ERROR');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('EBOOK', 'KDP_BOOK', 'TRAINING', 'SAAS', 'APP', 'SERVICE', 'DIGITAL_PRODUCT', 'AFFILIATE', 'OTHER');

-- CreateEnum
CREATE TYPE "EditorialCategory" AS ENUM ('EXPERTISE', 'EDUCATION', 'PROBLEM', 'SOLUTION', 'AUTHORITY', 'PROOF', 'BEHIND_THE_SCENES', 'CASE_STUDY', 'ENGAGEMENT', 'PRODUCT', 'OFFER', 'CTA');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'GENERATED', 'AWAITING_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "ContentLanguage" AS ENUM ('FR', 'EN');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'LOGO', 'DOCUMENT', 'THUMBNAIL');

-- CreateEnum
CREATE TYPE "VideoProjectStatus" AS ENUM ('DRAFT', 'SCRIPTING', 'STORYBOARD', 'RENDERING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "PublicationAttemptStatus" AS ENUM ('PENDING', 'LOCKED', 'SUCCESS', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "ConversionSource" AS ENUM ('IMPORTED', 'API', 'DECLARED');

-- CreateEnum
CREATE TYPE "AiGenerationKind" AS ENUM ('TEXT', 'IMAGE', 'TTS', 'VIDEO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RoleName" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoMediaId" TEXT,
    "colors" JSONB,
    "languages" TEXT[] DEFAULT ARRAY['fr']::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandGuideline" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "description" TEXT,
    "positioning" TEXT,
    "mission" TEXT,
    "audiences" JSONB,
    "personas" JSONB,
    "services" JSONB,
    "productsSummary" TEXT,
    "promise" TEXT,
    "tone" TEXT,
    "vocabulary" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "forbiddenPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ctas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priorityTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "forbiddenTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "competitors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disclaimers" JSONB,
    "affiliationRules" JSONB,
    "exampleUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "referenceDocs" JSONB,
    "typography" JSONB,
    "editorialRatios" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandGuideline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishingCadence" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "perWeek" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishingCadence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "displayName" TEXT NOT NULL,
    "externalId" TEXT,
    "avatarUrl" TEXT,
    "status" "SocialAccountStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialCredential" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "type" "ProductType" NOT NULL,
    "description" TEXT,
    "imageMediaId" TEXT,
    "price" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'EUR',
    "storeName" TEXT,
    "url" TEXT,
    "affiliateUrl" TEXT,
    "commissionPct" DECIMAL(5,2),
    "affiliateNetwork" TEXT,
    "audience" TEXT,
    "country" TEXT,
    "language" TEXT DEFAULT 'fr',
    "cta" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateLink" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "productId" TEXT,
    "campaignId" TEXT,
    "destinationUrl" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "source" TEXT,
    "medium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "isAffiliate" BOOLEAN NOT NULL DEFAULT false,
    "commissionPct" DECIMAL(5,2),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isSponsored" BOOLEAN NOT NULL DEFAULT false,
    "disclosureRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentIdea" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "campaignId" TEXT,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "category" "EditorialCategory",
    "sourceType" TEXT,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentMaster" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "campaignId" TEXT,
    "productId" TEXT,
    "ideaId" TEXT,
    "title" TEXT NOT NULL,
    "language" "ContentLanguage" NOT NULL DEFAULT 'FR',
    "category" "EditorialCategory",
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedApprovalVoidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVariant" (
    "id" TEXT NOT NULL,
    "contentMasterId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "socialAccountId" TEXT,
    "hook" TEXT,
    "bodyText" TEXT,
    "title" TEXT,
    "description" TEXT,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cta" TEXT,
    "link" TEXT,
    "mediaAssetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "format" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "isAffiliate" BOOLEAN NOT NULL DEFAULT false,
    "isSponsored" BOOLEAN NOT NULL DEFAULT false,
    "disclosureText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "brandId" TEXT,
    "type" "MediaType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "sizeBytes" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "campaignId" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoTemplate" (
    "id" TEXT NOT NULL,
    "brandId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoProject" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "contentMasterId" TEXT,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "language" "ContentLanguage" NOT NULL DEFAULT 'FR',
    "status" "VideoProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "script" TEXT,
    "voiceOverScript" TEXT,
    "aspectRatio" TEXT NOT NULL DEFAULT '9:16',
    "renderedMediaId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoScene" (
    "id" TEXT NOT NULL,
    "videoProjectId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT,
    "mediaAssetId" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 3000,
    "transition" TEXT,
    "subtitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "contentVariantId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "contentMasterId" TEXT,
    "decision" "ApprovalDecision" NOT NULL,
    "note" TEXT,
    "decidedById" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationAttempt" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "PublicationAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "PublicationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPost" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "providerPostId" TEXT NOT NULL,
    "providerUrl" TEXT,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "postId" TEXT,
    "platform" "SocialPlatform" NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impressions" INTEGER,
    "reach" INTEGER,
    "views" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "clicks" INTEGER,
    "followers" INTEGER,
    "source" TEXT NOT NULL,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickEvent" (
    "id" TEXT NOT NULL,
    "affiliateLinkId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "postId" TEXT,
    "platform" "SocialPlatform",
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,

    CONSTRAINT "ClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversion" (
    "id" TEXT NOT NULL,
    "affiliateLinkId" TEXT NOT NULL,
    "source" "ConversionSource" NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "amount" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'EUR',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "Conversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGeneration" (
    "id" TEXT NOT NULL,
    "brandId" TEXT,
    "userId" TEXT,
    "kind" "AiGenerationKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "prompt" TEXT,
    "resultRef" TEXT,
    "costEstimateCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCost" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "brandId" TEXT,
    "category" TEXT NOT NULL,
    "costCents" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "contentMasterId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "Brand_workspaceId_idx" ON "Brand"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_workspaceId_slug_key" ON "Brand"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "BrandGuideline_brandId_key" ON "BrandGuideline"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishingCadence_brandId_platform_key" ON "PublishingCadence"("brandId", "platform");

-- CreateIndex
CREATE INDEX "SocialAccount_brandId_platform_idx" ON "SocialAccount"("brandId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "SocialCredential_socialAccountId_key" ON "SocialCredential"("socialAccountId");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateLink_slug_key" ON "AffiliateLink"("slug");

-- CreateIndex
CREATE INDEX "AffiliateLink_brandId_idx" ON "AffiliateLink"("brandId");

-- CreateIndex
CREATE INDEX "Campaign_brandId_idx" ON "Campaign"("brandId");

-- CreateIndex
CREATE INDEX "ContentIdea_brandId_idx" ON "ContentIdea"("brandId");

-- CreateIndex
CREATE INDEX "ContentMaster_brandId_status_idx" ON "ContentMaster"("brandId", "status");

-- CreateIndex
CREATE INDEX "ContentVariant_contentMasterId_platform_idx" ON "ContentVariant"("contentMasterId", "platform");

-- CreateIndex
CREATE INDEX "MediaAsset_brandId_type_idx" ON "MediaAsset"("brandId", "type");

-- CreateIndex
CREATE INDEX "VideoTemplate_brandId_idx" ON "VideoTemplate"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoProject_contentMasterId_key" ON "VideoProject"("contentMasterId");

-- CreateIndex
CREATE INDEX "VideoProject_brandId_status_idx" ON "VideoProject"("brandId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VideoScene_videoProjectId_order_key" ON "VideoScene"("videoProjectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Post_contentVariantId_key" ON "Post"("contentVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "Post_idempotencyKey_key" ON "Post"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Post_brandId_status_idx" ON "Post"("brandId", "status");

-- CreateIndex
CREATE INDEX "Post_scheduledAt_idx" ON "Post"("scheduledAt");

-- CreateIndex
CREATE INDEX "Approval_postId_idx" ON "Approval"("postId");

-- CreateIndex
CREATE INDEX "PublicationAttempt_status_idx" ON "PublicationAttempt"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationAttempt_postId_attemptNumber_key" ON "PublicationAttempt"("postId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPost_postId_key" ON "PlatformPost"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPost_socialAccountId_providerPostId_key" ON "PlatformPost"("socialAccountId", "providerPostId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_brandId_platform_capturedAt_idx" ON "AnalyticsSnapshot"("brandId", "platform", "capturedAt");

-- CreateIndex
CREATE INDEX "ClickEvent_affiliateLinkId_occurredAt_idx" ON "ClickEvent"("affiliateLinkId", "occurredAt");

-- CreateIndex
CREATE INDEX "ClickEvent_brandId_idx" ON "ClickEvent"("brandId");

-- CreateIndex
CREATE INDEX "Conversion_affiliateLinkId_idx" ON "Conversion"("affiliateLinkId");

-- CreateIndex
CREATE INDEX "AiGeneration_brandId_kind_idx" ON "AiGeneration"("brandId", "kind");

-- CreateIndex
CREATE INDEX "AiCost_workspaceId_occurredAt_idx" ON "AiCost"("workspaceId", "occurredAt");

-- CreateIndex
CREATE INDEX "Notification_workspaceId_isRead_idx" ON "Notification"("workspaceId", "isRead");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_action_createdAt_idx" ON "AuditLog"("workspaceId", "action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_workspaceId_key_key" ON "Setting"("workspaceId", "key");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_logoMediaId_fkey" FOREIGN KEY ("logoMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandGuideline" ADD CONSTRAINT "BrandGuideline_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishingCadence" ADD CONSTRAINT "PublishingCadence_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialCredential" ADD CONSTRAINT "SocialCredential_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateLink" ADD CONSTRAINT "AffiliateLink_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateLink" ADD CONSTRAINT "AffiliateLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateLink" ADD CONSTRAINT "AffiliateLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentMaster" ADD CONSTRAINT "ContentMaster_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentMaster" ADD CONSTRAINT "ContentMaster_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentMaster" ADD CONSTRAINT "ContentMaster_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentMaster" ADD CONSTRAINT "ContentMaster_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ContentIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVariant" ADD CONSTRAINT "ContentVariant_contentMasterId_fkey" FOREIGN KEY ("contentMasterId") REFERENCES "ContentMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVariant" ADD CONSTRAINT "ContentVariant_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTemplate" ADD CONSTRAINT "VideoTemplate_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_contentMasterId_fkey" FOREIGN KEY ("contentMasterId") REFERENCES "ContentMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "VideoTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoScene" ADD CONSTRAINT "VideoScene_videoProjectId_fkey" FOREIGN KEY ("videoProjectId") REFERENCES "VideoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoScene" ADD CONSTRAINT "VideoScene_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_contentVariantId_fkey" FOREIGN KEY ("contentVariantId") REFERENCES "ContentVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_contentMasterId_fkey" FOREIGN KEY ("contentMasterId") REFERENCES "ContentMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationAttempt" ADD CONSTRAINT "PublicationAttempt_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPost" ADD CONSTRAINT "PlatformPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPost" ADD CONSTRAINT "PlatformPost_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickEvent" ADD CONSTRAINT "ClickEvent_affiliateLinkId_fkey" FOREIGN KEY ("affiliateLinkId") REFERENCES "AffiliateLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickEvent" ADD CONSTRAINT "ClickEvent_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_affiliateLinkId_fkey" FOREIGN KEY ("affiliateLinkId") REFERENCES "AffiliateLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCost" ADD CONSTRAINT "AiCost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCost" ADD CONSTRAINT "AiCost_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_contentMasterId_fkey" FOREIGN KEY ("contentMasterId") REFERENCES "ContentMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
