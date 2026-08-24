import { NotConfiguredError } from "@/lib/providers/text-ai";

export interface VideoRenderRequest {
  videoProjectId: string;
}

export interface VideoRenderResult {
  mediaAssetId: string;
  provider: string;
  costEstimateCents: number;
}

export interface VideoProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  render(req: VideoRenderRequest): Promise<VideoRenderResult>;
}

// Default, low-cost path: FFmpeg/Remotion-style template rendering from
// existing images/B-roll, Ken Burns/pan/zoom, overlays, subtitles, synthetic
// voice-over. No per-render generative-AI video cost. Rendering pipeline
// itself lands in Phase 6 — this is the interface + registration point.
export class TemplateVideoProvider implements VideoProvider {
  readonly name = "template";
  readonly isConfigured = true;

  async render(): Promise<VideoRenderResult> {
    throw new NotConfiguredError("Template video rendering pipeline (Phase 6, not yet implemented)");
  }
}

// Opt-in, disabled by default: full generative video. Never invoked unless
// VIDEO_PROVIDER=external_generative is explicitly set, because it can blow
// past the ~20 EUR/month budget in a handful of renders.
export class ExternalGenerativeVideoProvider implements VideoProvider {
  readonly name = "external_generative";
  readonly isConfigured = false;

  async render(): Promise<VideoRenderResult> {
    throw new NotConfiguredError("External generative video");
  }
}
