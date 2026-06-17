import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

const registerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName:  z.string().min(1).max(50),
  email:     z.string().email(),
  password:  z.string().min(8).max(100),
  orgName:   z.string().min(2).max(100),
  orgSector: z.string().optional(),
  orgSize:   z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    const { firstName, lastName, email, password, orgName, orgSector, orgSize } = parsed.data;

    // Check email uniqueness
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Un compte existe déjà avec cet email." }, { status: 409 });
    }

    // Create slug unique
    let slug = slugify(orgName);
    const existing_slug = await db.organization.findUnique({ where: { slug } });
    if (existing_slug) slug = `${slug}-${Date.now()}`;

    // Create org + user in transaction
    const result = await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug,
          sector: orgSector,
          employeeCount: orgSize ? parseInt(orgSize.split("-")[0]) : undefined,
        },
      });

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await tx.user.create({
        data: {
          email,
          name: `${firstName} ${lastName}`,
          firstName,
          lastName,
          role: "ORG_ADMIN",
          organizationId: org.id,
        },
      });

      // Store password hash in account table
      await tx.account.create({
        data: {
          userId: user.id,
          type: "credentials",
          provider: "credentials",
          providerAccountId: email,
          access_token: passwordHash,
        },
      });

      await tx.subscription.create({
        data: {
          organizationId: org.id,
          plan: "FREE",
          status: "TRIALING",
          seats: 3,
          modules: ["core", "duerp"],
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          action: "REGISTER",
          resource: "user",
          resourceId: user.id,
          details: { email, orgName },
        },
      });

      return { user, org };
    });

    return NextResponse.json({ success: true, userId: result.user.id }, { status: 201 });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Erreur serveur. Veuillez réessayer." }, { status: 500 });
  }
}
