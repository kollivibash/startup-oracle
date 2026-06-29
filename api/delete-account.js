// Vercel Serverless Function — permanently delete the caller's account.
//
// The client can't delete an auth user (that needs the service-role key), so the
// old in-app "Delete account" only logged the user out — their profile/posts/etc.
// stayed in Supabase and kept showing up in search. This endpoint does the real
// deletion: it verifies the caller's own session, then deletes their auth user
// with the service-role key. Because `profiles.id references auth.users(id) on
// delete cascade` (and posts/follows/messages/ratings cascade from profiles),
// deleting the auth user removes ALL of their data in one shot.
//
// Requires the Vercel env var SUPABASE_SERVICE_ROLE_KEY (same one the Razorpay
// webhook uses). Until it's set, this returns 500 and the client surfaces an error
// instead of pretending the account was deleted.

/* global process */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jdqizltpalpefzvckinq.supabase.co";
// anon key — safe here (public, protected by RLS); used only to verify the caller.
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcWl6bHRwYWxwZWZ6dmNraW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NDA2MjIsImV4cCI6MjA5NjExNjYyMn0.Ti_7LoBVniWzi3kSU8i-GG0l-boANBVkKc85L0nczEM";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // 1. The caller may only delete THEIR OWN account — verify their session token.
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  let userId;
  try {
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await anon.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: "Invalid or expired session" });
    userId = data.user.id;
  } catch {
    return res.status(401).json({ error: "Auth verification failed" });
  }

  // 2. Service-role client (bypasses RLS, can delete auth users).
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: "Account deletion isn't configured yet." });
  const admin = createClient(SUPABASE_URL, serviceKey);

  // 3. Best-effort: remove the user's uploaded files (avatars + post media live
  //    under a <uid>/ folder). Storage isn't covered by the DB cascade. Non-fatal.
  try {
    for (const bucket of ["avatars", "post-media"]) {
      const { data: files } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
      if (files?.length) {
        await admin.storage.from(bucket).remove(files.map(f => `${userId}/${f.name}`));
      }
    }
  } catch {
    /* storage cleanup is best-effort; don't block account deletion on it */
  }

  // 4. Delete the auth user → cascades to profiles → posts/follows/messages/ratings/…
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("delete-account failed:", error.message || error);
    return res.status(500).json({ error: "Could not delete account. Please try again." });
  }

  return res.status(200).json({ ok: true });
}
