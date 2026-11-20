import { createResourceStatusFeed } from "./resourceStatus.js";
import { RESOURCE_STATUS_INDEX_PATH, RESOURCE_STATUS_INDEX_VERSION } from "./resourceStatusIndex.js";

export function createResourceStatusHandler(getFirebase) {
  let feed;
  let closed = false;
  async function resourceStatus(req, res) {
    res.set("Cache-Control", "private, no-store");
    const header = req.get("Authorization");
    const token = header?.length <= 8192 ? header.match(/^Bearer ([^\s]+)$/i)?.[1] : null;
    if (!token) return res.sendStatus(401);
    if (closed) return res.sendStatus(503);

    let firebase;
    try {
      firebase = await getFirebase();
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
      const index = (await db.doc(RESOURCE_STATUS_INDEX_PATH).get()).data();
      if (closed || index?.version !== RESOURCE_STATUS_INDEX_VERSION || index.ready !== true) return res.sendStatus(503);
      feed ??= createResourceStatusFeed(db);
      return res.json(await feed.read());
    } catch {
      return res.sendStatus(503);
    }
  }
  resourceStatus.close = () => {
    closed = true;
    feed?.close();
  };
  return resourceStatus;
}
