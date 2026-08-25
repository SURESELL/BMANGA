import { NotConfiguredError } from "@/lib/providers/text-ai";

export interface TTSRequest {
  text: string;
  language: "fr" | "en";
  voice?: string;
  speed?: number;
  volume?: number;
}

export interface TTSResult {
  mediaAssetId: string;
  provider: string;
  costEstimateCents: number;
}

export interface TTSProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  synthesize(req: TTSRequest): Promise<TTSResult>;
}

export class NullTTSProvider implements TTSProvider {
  readonly name = "none";
  readonly isConfigured = false;

  async synthesize(): Promise<TTSResult> {
    throw new NotConfiguredError("TTS");
  }
}
