import { NextRequest, NextResponse } from "next/server";
import {
  adminAuthClient,
  adminSessionCookieName,
  hasConfiguredAdmins,
  isConfiguredAdmin,
} from "@/lib/supabase/admin-server";

export const runtime = "nodejs";

function clearAdminSession(response: NextResponse) {
  response.cookies.set(adminSessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 0,
  });
  return response;
}

export async function POST(request: NextRequest) {
  if (!adminAuthClient || !hasConfiguredAdmins) {
    return clearAdminSession(new NextResponse(null, { status: 204 }));
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return clearAdminSession(new NextResponse(null, { status: 204 }));

  const { data, error } = await adminAuthClient.auth.getUser(token);
  if (error || !data.user || !isConfiguredAdmin(data.user.email)) {
    return clearAdminSession(new NextResponse(null, { status: 204 }));
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(adminSessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 60 * 60,
  });
  return response;
}

export async function DELETE() {
  return clearAdminSession(new NextResponse(null, { status: 204 }));
}
