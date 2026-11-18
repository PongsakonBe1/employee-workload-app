import { Router } from "express";
import { createResourceStatusFeed } from "../services/resourceStatus.js";

export function createResourceStatusRouter(getFirebase) {
  const router = Router();
  let readStatus;
  router.get("/", async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    const header = req.get("Authorization");
    const token = header?.length <= 8192 ? header.match(/^Bearer ([^\s]+)$/i)?.[1] : null;
    if (!token) return res.sendStatus(401);

    let firebase;
    try {
      firebase = getFirebase();
    } catch {
      return res.sendStatus(503);
    }
    let identity;
    try {
      identity = await firebase.auth().verifyIdToken(token, true);
    } catch {
      return res.sendStatus(401);
    }

    try {
      if (identity.email_verified !== true || !identity.email) return res.sendStatus(403);
      const db = firebase.firestore();
      const profile = (await db.collection("users").doc(identity.uid).get()).data();
      if (profile?.active !== true || !["staff", "admin", "superadmin"].includes(profile.role) ||
          (profile.role === "superadmin" && profile.email !== identity.email)) return res.sendStatus(403);
      readStatus ??= createResourceStatusFeed(db);
      return res.json(await readStatus());
    } catch {
      return res.sendStatus(503);
    }
  });
  return router;
}
