import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { createAuthEndpoint } from "better-auth/api";
import { HIDE_METADATA } from "better-auth";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import { getDbSync } from "@/lib/db/client";
import { account, session, user, verification } from "@/lib/db/schema";
import { siteUrl } from "@/lib/site-url";
import { runtimeEnv } from "@/lib/runtime-env";

function authSecret() {
  return (
    runtimeEnv("BETTER_AUTH_SECRET") ||
    (process.env.NODE_ENV === "production" ? "" : "dev-muslimowned-sg-auth-secret-change-me")
  );
}

function createAuth() {
  return betterAuth({
    secret: authSecret(),
    baseURL: siteUrl(),
    basePath: "/api/better-auth",
    trustedOrigins: [siteUrl()],
    database: drizzleAdapter(getDbSync(), {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: { enabled: false },
    plugins: [
      {
        id: "passwordless-bridge",
        endpoints: {
          completePasswordless: createAuthEndpoint(
            "/complete-passwordless",
            {
              method: "POST",
              metadata: HIDE_METADATA,
              body: z.object({ email: z.string().email() }),
            },
            async (ctx) => {
              const email = ctx.body.email.trim().toLowerCase();
              const found = await ctx.context.internalAdapter.findUserByEmail(email);
              let authUser = found?.user;
              if (!authUser) {
                authUser = await ctx.context.internalAdapter.createUser(
                  {
                    email,
                    emailVerified: true,
                    name: email.split("@")[0] || "owner",
                  } as never,
                  { method: "email" } as never,
                );
              } else if (!authUser.emailVerified) {
                authUser =
                  (await ctx.context.internalAdapter.updateUser(authUser.id, {
                    emailVerified: true,
                  })) || authUser;
              }
              const sessionRow = await ctx.context.internalAdapter.createSession(authUser.id);
              if (!sessionRow) {
                throw ctx.error("INTERNAL_SERVER_ERROR", { message: "Could not create a session." });
              }
              await setSessionCookie(ctx, { session: sessionRow, user: authUser });
              return ctx.json({
                user: authUser,
                session: sessionRow,
              });
            },
          ),
        },
      },
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;

let cached: Auth | null = null;

export function getAuth(): Auth {
  if (!cached) cached = createAuth();
  return cached;
}

export type AuthSessionUser = {
  uid: string;
  email?: string;
  name?: string | null;
};

export async function getRequestSession(headers: Headers): Promise<AuthSessionUser | null> {
  const sessionData = await getAuth().api.getSession({ headers });
  if (!sessionData?.user) return null;
  return {
    uid: sessionData.user.id,
    email: sessionData.user.email,
    name: sessionData.user.name,
  };
}

export async function createPasswordlessSession(email: string, headers: Headers) {
  return getAuth().api.completePasswordless({
    body: { email: email.trim().toLowerCase() },
    headers,
  });
}
