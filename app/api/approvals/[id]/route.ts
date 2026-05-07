import { NextResponse } from "next/server";
import { resumeAgentRunAfterApproval } from "@/lib/agents/process-run";
import { patchApprovalSchema } from "@/lib/schemas/approvals";
import { uuidRouteParamSchema } from "@/lib/schemas/route-params";
import {
  markRunCancelled,
  updateRunStepByNode,
} from "@/lib/agents/save-results";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

type ApprovalPayload = {
  nodeId?: string;
  approvalNodeReactFlowId?: string;
  runId?: string;
};

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const raw = await ctx.params;
    const parsedParams = uuidRouteParamSchema.safeParse(raw);
    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const json = await req.json();
    const parsedBody = patchApprovalSchema.safeParse(json);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsedBody.error.flatten() },
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

    const approvalId = parsedParams.data.id;

    const { data: approval, error: apprErr } = await supabase
      .from("approvals")
      .select("id, status, run_id, agent_id, payload")
      .eq("id", approvalId)
      .maybeSingle();

    if (apprErr || !approval) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }

    const { data: owned } = await supabase
      .from("agents")
      .select("id")
      .eq("id", approval.agent_id as string)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!owned) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const status = approval.status as string;
    const body = parsedBody.data;
    const desired = body.status;

    if (status !== "pending") {
      if (status === desired) {
        return NextResponse.json({ ok: true, idempotent: true });
      }
      return NextResponse.json(
        { error: `Approval is not pending (current: ${status}).` },
        { status: 409 },
      );
    }

    const runId = approval.run_id as string | null;
    if (!runId) {
      return NextResponse.json({ error: "Approval has no linked run." }, { status: 400 });
    }

    const payload = (approval.payload ?? {}) as ApprovalPayload;
    const approvalNodeId =
      (typeof payload.approvalNodeReactFlowId === "string" && payload.approvalNodeReactFlowId) ||
      (typeof payload.nodeId === "string" && payload.nodeId) ||
      null;

    if (!approvalNodeId) {
      return NextResponse.json(
        { error: "Approval payload missing approval node id." },
        { status: 400 },
      );
    }

    const { data: runRow } = await supabase
      .from("agent_runs")
      .select("id, status")
      .eq("id", runId)
      .maybeSingle();

    if (!runRow) {
      return NextResponse.json({ error: "Linked run not found." }, { status: 400 });
    }

    if ((runRow.status as string) !== "waiting_for_approval") {
      return NextResponse.json(
        {
          error: `Run is not waiting for approval (status: ${String(runRow.status)}).`,
        },
        { status: 409 },
      );
    }

    const approvalUpdates: Record<string, unknown> = {
      status: desired,
      updated_at: new Date().toISOString(),
    };
    if (body.category !== undefined) approvalUpdates.category = body.category;
    if (body.reviewer_note !== undefined) approvalUpdates.reviewer_note = body.reviewer_note;
    if (body.reject_reason !== undefined) approvalUpdates.reject_reason = body.reject_reason;
    if (body.edited_payload !== undefined) approvalUpdates.edited_payload = body.edited_payload;

    const { error: apprUpdateErr } = await supabase
      .from("approvals")
      .update(approvalUpdates)
      .eq("id", approvalId)
      .eq("status", "pending");

    if (apprUpdateErr) {
      return NextResponse.json({ error: apprUpdateErr.message }, { status: 500 });
    }

    if (desired === "rejected") {
      const { data: stepRow } = await supabase
        .from("agent_run_steps")
        .select("output")
        .eq("run_id", runId)
        .eq("node_id", approvalNodeId)
        .eq("status", "waiting_for_approval")
        .maybeSingle();

      const prevOut =
        stepRow?.output && typeof stepRow.output === "object" && !Array.isArray(stepRow.output)
          ? (stepRow.output as Record<string, unknown>)
          : {};
      const mergedOut = {
        ...prevOut,
        resolution: "rejected",
        resolvedAt: new Date().toISOString(),
      };

      await updateRunStepByNode(supabase, {
        runId,
        nodeId: approvalNodeId,
        fromStatus: "waiting_for_approval",
        toStatus: "rejected",
        output: mergedOut,
        error: "Approval rejected by user.",
      });

      await markRunCancelled(supabase, runId, {
        summary: "Run cancelled after approval was rejected.",
        approvalId,
        approvalNodeId,
      });

      return NextResponse.json({ ok: true, runId });
    }

    const { data: stepRow } = await supabase
      .from("agent_run_steps")
      .select("output")
      .eq("run_id", runId)
      .eq("node_id", approvalNodeId)
      .eq("status", "waiting_for_approval")
      .maybeSingle();

    const prevOut =
      stepRow?.output && typeof stepRow.output === "object" && !Array.isArray(stepRow.output)
        ? (stepRow.output as Record<string, unknown>)
        : {};
    const mergedOut = {
      ...prevOut,
      resolution: "approved",
      resolvedAt: new Date().toISOString(),
    };

    const { updated } = await updateRunStepByNode(supabase, {
      runId,
      nodeId: approvalNodeId,
      fromStatus: "waiting_for_approval",
      toStatus: "completed",
      output: mergedOut,
      error: null,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "No waiting approval step found to resolve (possible double-submit)." },
        { status: 409 },
      );
    }

    const resume = await resumeAgentRunAfterApproval(supabase, runId, approvalNodeId);
    if (!resume.ok) {
      return NextResponse.json({ error: resume.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, runId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
