import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { authConfig } from "@/lib/auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase().trim();
        const rateLimitKey = `login:${email}`;

        // Verrou anti-brute-force par identifiant : ne dépend pas de l'IP pour
        // rester efficace derrière un proxy/CDN partagé.
        const rl = checkRateLimit(rateLimitKey, RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MS);
        if (!rl.allowed) return null;

        const user = await db.user.findUnique({ where: { email } });

        // Réponse constante (pas de fuite d'information) : compte inexistant,
        // inactif ou sans mot de passe défini (ex. compte 100% OAuth) échouent
        // de la même façon qu'un mauvais mot de passe.
        if (!user || !user.isActive || !user.passwordHash) return null;

        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
          return null;
        }

        const valid = await verifyPassword(user.passwordHash, parsed.data.password);

        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts,
              lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MS) : null,
            },
          });
          await db.auditLog.create({
            data: {
              organizationId: user.organizationId,
              userId: user.id,
              action: shouldLock ? "LOGIN_LOCKED" : "LOGIN_FAILED",
              resource: "user",
              resourceId: user.id,
            },
          });
          return null;
        }

        resetRateLimit(rateLimitKey);
        await db.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
        });
        await db.auditLog.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            action: "LOGIN_SUCCESS",
            resource: "user",
            resourceId: user.id,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  // jwt/session callbacks viennent de authConfig (lib/auth.config.ts),
  // partagées avec le middleware Edge Runtime.
});
