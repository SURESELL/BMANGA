import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { searchUnitesLegales, InseeApiError } from "@/lib/insee/client";
import { checkRateLimit } from "@/lib/rate-limit";

const querySchema = z.object({ q: z.string().trim().min(2).max(200) });

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const rl = checkRateLimit(`insee-user:${session.user.id}`, 20, 60 * 1000);
  if (!rl.allowed) return NextResponse.json({ error: "Trop de requêtes, réessayez dans un instant." }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ q: searchParams.get("q") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Le paramètre de recherche 'q' doit contenir au moins 2 caractères." }, { status: 400 });
  }

  try {
    const result = await searchUnitesLegales(parsed.data.q);
    return NextResponse.json({
      data: result,
      source: "API Sirene INSEE 3.11",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof InseeApiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[company/search]", err);
    return NextResponse.json({ error: "Erreur inattendue." }, { status: 500 });
  }
}
