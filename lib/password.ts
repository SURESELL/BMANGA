import argon2 from "argon2";
import { randomBytes, createHash } from "crypto";

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB — minimum OWASP recommandé pour Argon2id
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/** Politique de sécurité minimale : 8+ caractères, majuscule, minuscule, chiffre. */
export function isPasswordStrong(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

/** Génère un mot de passe temporaire conforme à la politique, lisible par un humain. */
export function generateTemporaryPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  const pick = (set: string) => set[randomBytes(1)[0] % set.length];
  const required = [pick(upper), pick(lower), pick(digits)];
  const rest = Array.from({ length: 9 }, () => pick(all));
  return [...required, ...rest].sort(() => randomBytes(1)[0] - 128).join("");
}

/** Jeton opaque pour réinitialisation de mot de passe : la valeur en clair n'est
 * jamais stockée, seul son hash SHA-256 l'est (comparable en O(1), non réversible). */
export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
