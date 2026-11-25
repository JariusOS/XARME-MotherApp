import "server-only";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  userId?: string;
  pkce?: { verifier: string; state: string };
  walletNonce?: string;
};

const secret = process.env.SESSION_SECRET;

const options: SessionOptions = {
  cookieName: "xarme_session",
  password: secret ?? "dev-only-insecure-session-secret-change-me-0123456789",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  },
};

export function getSession() {
  // Checked per request (not at import) so `next build` works without secrets.
  if (!secret && process.env.NODE_ENV === "production" && !process.env.ALLOW_DEV_SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production");
  }
  return getIronSession<SessionData>(cookies(), options);
}
