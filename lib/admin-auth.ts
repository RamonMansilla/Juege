import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export async function getAdminUser() {
  const sessionClient = await createServerSupabase();
  if (!sessionClient) return null;
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return null;
  const adminClient = createAdminSupabase();
  if (!adminClient) return null;
  const { data, error } = await adminClient.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  return error || !data ? null : user;
}
