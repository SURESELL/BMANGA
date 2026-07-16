import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUniteLegaleBySiren, InseeApiError } from "@/lib/insee/client";
import { validateSiren } from "@/lib/insee/validation";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ siren: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const rl = checkRateLimit(`insee-user:${session.user.id}`, 20, 60 * 1000);
  if (!rl.allowed) return NextResponse.json({ error: "Trop de requêtes, réessayez dans un instant." }, { status: 429 });

  const { siren } = await params;
  const validation = validateSiren(siren);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const result = await fetchUniteLegaleBySiren(validation.normalized);
    return NextResponse.json({
      data: result,
      source: "API Sirene INSEE 3.11",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof InseeApiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[company/siren]", err);
    return NextResponse.json({ error: "Erreur inattendue." }, { status: 500 });
  }
}
