import { redirect } from "next/navigation";
import AdminConsole from "./admin-console";
import { getAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login?denied=1");
  return <AdminConsole email={user.email || "Equipo JUEGUE"} />;
}
