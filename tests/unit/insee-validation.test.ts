import { describe, expect, it } from "vitest";
import { isValidLuhn, normalizeDigits, validateSiren, validateSiret } from "@/lib/insee/validation";

describe("normalizeDigits", () => {
  it("strips spaces and separators", () => {
    expect(normalizeDigits("552 100 554")).toEqual("552100554");
    expect(normalizeDigits("552-100-554")).toEqual("552100554");
  });
});

describe("validateSiren", () => {
  it("accepts a well-formed SIREN with a valid Luhn key (Google France)", () => {
    // SIREN publiquement connu et vérifiable (Google France).
    const result = validateSiren("552100554");
    expect(result.valid).toBe(true);
    expect(result.normalized).toEqual("552100554");
  });

  it("rejects a SIREN with the wrong number of digits", () => {
    const result = validateSiren("12345");
    expect(result.valid).toBe(false);
  });

  it("rejects a SIREN with an invalid checksum", () => {
    const result = validateSiren("123456789");
    expect(result.valid).toBe(false);
  });

  it("rejects non-numeric input", () => {
    const result = validateSiren("55210055A");
    expect(result.valid).toBe(false);
  });
});

describe("validateSiret", () => {
  it("rejects a SIRET with the wrong length", () => {
    const result = validateSiret("552100554000");
    expect(result.valid).toBe(false);
  });

  it("rejects an invalid checksum", () => {
    const result = validateSiret("12345678901234");
    expect(result.valid).toBe(false);
  });
});

describe("isValidLuhn", () => {
  it("validates a known-correct sequence", () => {
    expect(isValidLuhn("552100554")).toBe(true);
  });

  it("rejects a tampered sequence", () => {
    expect(isValidLuhn("552100555")).toBe(false);
  });
});
