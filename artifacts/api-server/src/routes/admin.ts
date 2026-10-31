import { clerkClient, getAuth } from "@clerk/express";
import { Router, type IRouter, type RequestHandler } from "express";
import { logger } from "../lib/logger";

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
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
