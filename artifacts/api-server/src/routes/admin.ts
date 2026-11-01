import { clerkClient, getAuth } from "@clerk/express";
import { Router, type IRouter, type RequestHandler } from "express";
import { logger } from "../lib/logger";

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const auth = getAuth(req);
  const { userId } = auth;
  if (!userId) {
    // Never log the debug object: it can contain credentials and token data.
    // Only known SDK reason codes and header-presence booleans are safe here.
    const safeReasons = new Set([
      "client-uat-but-no-session-token",
      "dev-browser-missing",
      "dev-browser-sync",
      "session-token-and-uat-missing",
      "session-token-missing",
      "session-token-expired",
      "session-token-iat-before-client-uat",
      "session-token-nbf",
      "session-token-iat-in-the-future",
      "session-token-but-no-client-uat",
      "token-type-mismatch",
      "token-expired",
      "token-invalid",
      "token-invalid-algorithm",
      "token-invalid-authorized-parties",
      "token-invalid-issuer",
      "token-invalid-signature",
      "token-not-active-yet",
      "jwk-local-missing",
      "jwk-remote-failed-to-load",
      "jwk-remote-invalid",
      "jwk-remote-missing",
      "unexpected-error",
    ]);
    let clerkReason = "unknown";
    try {
      const reason: unknown = auth.debug()?.reason;
      if (typeof reason === "string" && safeReasons.has(reason)) {
        clerkReason = reason;
      }
    } catch {
      // Diagnostics must never change access control or break the 401 response.
    }
    logger.warn(
      {
        clerkReason,
        bearerPresent: /^Bearer\s+\S+$/i.test(req.headers.authorization ?? ""),
        sessionCookiePresent: /(?:^|;\s*)__session(?:_[^=;]+)?=/.test(
          req.headers.cookie ?? "",
        ),
      },
      "Admin authentication rejected",
    );
    res.setHeader("Cache-Control", "no-store");
    res.status(401).json({ error: "Sign in is required." });
    return;
  }

  const configuredAdminEmail = process.env.CLERK_FIRST_ADMIN_EMAIL
    ?.trim()
    .toLocaleLowerCase();
  if (!configuredAdminEmail) {
    res.status(503).json({ error: "Admin access is not configured." });
    return;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId,
    );
    const isVerifiedAdmin =
      primaryEmail?.verification?.status === "verified" &&
      primaryEmail.emailAddress.trim().toLocaleLowerCase() ===
        configuredAdminEmail;

    if (!isVerifiedAdmin) {
      res.status(403).json({ error: "This account does not have admin access." });
      return;
    }

    next();
  } catch (error) {
    logger.error({ err: error, userId }, "Failed to verify admin access");
    res.status(503).json({ error: "Could not verify admin access." });
  }
};

const router: IRouter = Router();

router.get("/admin/access", requireAdmin, (_req, res) => {
  res.json({ isAdmin: true, role: "admin" });
});

export default router;
