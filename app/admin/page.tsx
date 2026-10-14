import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import AdminDashboard from "./admin-dashboard";
import {
  adminAuthClient,
  adminSessionCookieName,
  hasConfiguredAdmins,
  isConfiguredAdmin,
} from "@/lib/supabase/admin-server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!adminAuthClient || !hasConfiguredAdmins) notFound();

  const token = (await cookies()).get(adminSessionCookieName)?.value;
  if (!token) notFound();

  const { data, error } = await adminAuthClient.auth.getUser(token);
  if (error || !isConfiguredAdmin(data.user?.email)) notFound();

  return <AdminDashboard />;
}
