import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";

export async function POST() {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = await createRouteHandlerSupabase(response);
    await supabase.auth.signOut({ scope: "global" });
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
