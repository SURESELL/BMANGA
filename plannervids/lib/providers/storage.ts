export interface StorageProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  put(key: string, data: Buffer, contentType: string): Promise<{ key: string; url: string }>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

// Dev-only fallback so the app is usable with zero cloud dependencies before
// Cloudflare R2 (or any S3-compatible bucket) is configured. Never use in
// production — see STORAGE_PROVIDER in .env.example.
export class NotConfiguredStorageProvider implements StorageProvider {
  readonly name = "none";
  readonly isConfigured = false;

  async put(): Promise<{ key: string; url: string }> {
    throw new Error("Storage provider not configured — set STORAGE_PROVIDER (e.g. r2) in the environment");
  }

  async getSignedUrl(): Promise<string> {
    throw new Error("Storage provider not configured");
  }

  async delete(): Promise<void> {
    throw new Error("Storage provider not configured");
  }
}
