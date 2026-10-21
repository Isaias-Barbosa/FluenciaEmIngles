import { NextRequest, NextResponse } from "next/server";
import { adminAuthClient, adminServiceClient, hasConfiguredAdmins, isConfiguredAdmin } from "@/lib/supabase/admin-server";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: NextRequest) {
  if (!adminAuthClient || !adminServiceClient || !hasConfiguredAdmins) return json({ error: "Administração não configurada." }, 503);
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return json({ error: "Entre na sua conta para continuar." }, 401);
  try {
    const { data, error } = await adminAuthClient.auth.getUser(token);
    if (error || !data.user) return json({ error: "Sessão inválida." }, 401);
    if (!isConfiguredAdmin(data.user.email)) return json({ error: "Acesso restrito à administração." }, 403);
    const page = Number(new URL(request.url).searchParams.get("page") || 0), pageSize = 20;
    if (!Number.isSafeInteger(page) || page < 0 || page > 50000) return json({ error: "Página inválida." }, 400);
    const result = await adminServiceClient.rpc("get_student_feedback", { p_offset: page * pageSize, p_limit: pageSize });
    if (result.error) return json({ error: "Feedbacks indisponíveis. Confira a migration 20261021000000_feedback_and_flashcard_progress.sql." }, 503);
    return json({ ...(result.data as { feedbacks: unknown[]; total: number }), page, pageSize });
  } catch { return json({ error: "Não foi possível carregar os feedbacks." }, 503); }
}
