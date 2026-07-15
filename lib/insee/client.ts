import { checkRateLimit } from "@/lib/rate-limit";

const INSEE_BASE_URL = "https://api.insee.fr/api-sirene/3.11";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const CACHE_TTL_MS = 5 * 60 * 1000;

export class InseeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code:
      | "INVALID_REQUEST"
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "RATE_LIMITED"
      | "UPSTREAM_ERROR"
      | "UPSTREAM_UNAVAILABLE"
      | "TIMEOUT"
      | "NOT_CONFIGURED"
  ) {
    super(message);
    this.name = "InseeApiError";
  }
}

function mapStatusToError(status: number): InseeApiError {
  switch (status) {
    case 400:
      return new InseeApiError("Requête invalide envoyée à l'API Sirene.", 400, "INVALID_REQUEST");
    case 401:
      return new InseeApiError("Clé API Sirene invalide ou absente.", 401, "UNAUTHORIZED");
    case 403:
      return new InseeApiError("Accès refusé par l'API Sirene (droits insuffisants ou donnée non diffusible).", 403, "FORBIDDEN");
    case 404:
      return new InseeApiError("Aucun établissement trouvé pour cette recherche.", 404, "NOT_FOUND");
    case 429:
      return new InseeApiError("Quota de l'API Sirene dépassé, veuillez réessayer plus tard.", 429, "RATE_LIMITED");
    case 500:
      return new InseeApiError("Erreur interne de l'API Sirene.", 500, "UPSTREAM_ERROR");
    case 503:
      return new InseeApiError("API Sirene temporairement indisponible.", 503, "UPSTREAM_UNAVAILABLE");
    default:
      return new InseeApiError(`Réponse inattendue de l'API Sirene (HTTP ${status}).`, status, "UPSTREAM_ERROR");
  }
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function inseeFetch<T>(path: string, cacheKey: string): Promise<T> {
  const apiKey = process.env.INSEE_API_KEY;
  if (!apiKey) {
    throw new InseeApiError(
      "INSEE_API_KEY n'est pas configurée sur cet environnement — l'intégration Sirene est indisponible.",
      503,
      "NOT_CONFIGURED"
    );
  }

  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  // Protège le quota INSEE côté serveur, indépendamment du rate limiting
  // appliqué par utilisateur dans les routes appelantes.
  const rl = checkRateLimit("insee:global", 30, 60 * 1000);
  if (!rl.allowed) {
    throw new InseeApiError("Quota interne de requêtes Sirene atteint, veuillez réessayer dans une minute.", 429, "RATE_LIMITED");
  }

  let lastError: InseeApiError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${INSEE_BASE_URL}${path}`, {
        headers: {
          "X-INSEE-Api-Key-Integration": apiKey,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as T;
        setCached(cacheKey, data);
        return data;
      }

      const error = mapStatusToError(res.status);
      // Ne réessaie que les erreurs transitoires (429/500/503), jamais les
      // erreurs de requête ou d'autorisation.
      if (![429, 500, 503].includes(res.status) || attempt === MAX_RETRIES) {
        throw error;
      }
      lastError = error;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof InseeApiError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        lastError = new InseeApiError("Délai d'attente dépassé lors de l'appel à l'API Sirene.", 504, "TIMEOUT");
        if (attempt === MAX_RETRIES) throw lastError;
      } else {
        throw new InseeApiError("Erreur réseau lors de l'appel à l'API Sirene.", 502, "UPSTREAM_ERROR");
      }
    }

    // Backoff exponentiel avant la prochaine tentative.
    await new Promise((resolve) => setTimeout(resolve, 300 * Math.pow(2, attempt)));
  }

  throw lastError ?? new InseeApiError("Échec de l'appel à l'API Sirene.", 502, "UPSTREAM_ERROR");
}

export interface InseeUniteLegale {
  siren: string;
  uniteLegale: Record<string, unknown>;
}

export interface InseeEtablissement {
  siret: string;
  etablissement: Record<string, unknown>;
}

export async function fetchUniteLegaleBySiren(siren: string): Promise<InseeUniteLegale> {
  return inseeFetch<InseeUniteLegale>(`/siren/${siren}`, `siren:${siren}`);
}

export async function fetchEtablissementBySiret(siret: string): Promise<InseeEtablissement> {
  return inseeFetch<InseeEtablissement>(`/siret/${siret}`, `siret:${siret}`);
}

export async function searchUnitesLegales(query: string): Promise<Record<string, unknown>> {
  return inseeFetch<Record<string, unknown>>(`/siren?q=${encodeURIComponent(query)}`, `search:${query}`);
}
