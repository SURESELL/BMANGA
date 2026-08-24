export interface TextGenerationRequest {
  brandId: string;
  language: "fr" | "en";
  kind: "idea" | "hook" | "post" | "caption" | "title" | "description" | "hashtags" | "cta" | "video_script" | "voice_over_script";
  prompt: string;
  brandBrainContext: string;
}

export interface TextGenerationResult {
  text: string;
  provider: string;
  costEstimateCents: number;
}

export interface TextAIProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  generate(req: TextGenerationRequest): Promise<TextGenerationResult>;
}

export class NotConfiguredError extends Error {
  constructor(providerKind: string) {
    super(`${providerKind} provider not configured`);
    this.name = "NotConfiguredError";
  }
}

export class NullTextAIProvider implements TextAIProvider {
  readonly name = "none";
  readonly isConfigured = false;

  async generate(): Promise<TextGenerationResult> {
    throw new NotConfiguredError("Text AI");
  }
}
