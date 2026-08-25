import { NotConfiguredError } from "@/lib/providers/text-ai";

export type ImageRatio = "1:1" | "4:5" | "9:16" | "16:9" | string;

export interface ImageGenerationRequest {
  brandId: string;
  prompt: string;
  ratio: ImageRatio;
  variantsCount?: number;
}

export interface ImageGenerationResult {
  mediaAssetIds: string[];
  provider: string;
  costEstimateCents: number;
}

export interface ImageGenerationProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  generate(req: ImageGenerationRequest): Promise<ImageGenerationResult>;
}

export class NullImageGenerationProvider implements ImageGenerationProvider {
  readonly name = "none";
  readonly isConfigured = false;

  async generate(): Promise<ImageGenerationResult> {
    throw new NotConfiguredError("Image AI");
  }
}
