import { NextResponse } from "next/server";
import { postMemorySchema } from "@/lib/schemas/memory";
import { listCompanyMemory, addCompanyMemory } from "@/lib/memory/memory-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") ?? undefined;
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : 50;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await listCompanyMemory(supabase, user.id, {
      scope,
      limit: Number.isFinite(limit) ? Math.min(100, Math.max(1, limit)) : 50,
    });

    return NextResponse.json({ memory: rows });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = postMemorySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const row = await addCompanyMemory(
      supabase,
      user.id,
      parsed.data.scope,
      parsed.data.content,
    );

    return NextResponse.json({ id: row?.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
