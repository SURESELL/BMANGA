/** Normalise en ne gardant que les chiffres (espaces, tirets, points tolérés en saisie). */
export function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidSirenFormat(value: string): boolean {
  return /^\d{9}$/.test(value);
}

export function isValidSiretFormat(value: string): boolean {
  return /^\d{14}$/.test(value);
}

/**
 * Clé de Luhn (algorithme utilisé par l'INSEE pour la majorité des SIREN/SIRET).
 * Exception connue : les établissements de La Poste (SIREN 356000000) suivent une
 * règle différente (modulo 5) — cette fonction reste donc une aide au contrôle de
 * saisie, pas une garantie absolue de validité. La confirmation finale vient
 * toujours de la réponse de l'API Sirene elle-même.
 */
export function isValidLuhn(digits: string): boolean {
  let sum = 0;
  const len = digits.length;
  for (let i = 0; i < len; i++) {
    let digit = parseInt(digits[len - 1 - i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export interface ValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

export function validateSiren(input: string): ValidationResult {
  const normalized = normalizeDigits(input);
  if (!isValidSirenFormat(normalized)) {
    return { valid: false, normalized, error: "Le SIREN doit contenir exactement 9 chiffres." };
  }
  if (!isValidLuhn(normalized) && !normalized.startsWith("356000000")) {
    return { valid: false, normalized, error: "SIREN invalide (clé de contrôle incorrecte)." };
  }
  return { valid: true, normalized };
}

export function validateSiret(input: string): ValidationResult {
  const normalized = normalizeDigits(input);
  if (!isValidSiretFormat(normalized)) {
    return { valid: false, normalized, error: "Le SIRET doit contenir exactement 14 chiffres." };
  }
  if (!isValidLuhn(normalized) && !normalized.startsWith("356000000")) {
    return { valid: false, normalized, error: "SIRET invalide (clé de contrôle incorrecte)." };
  }
  return { valid: true, normalized };
}
