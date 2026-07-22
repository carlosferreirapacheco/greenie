import { supabase } from "./client";

export type ReportTargetType = "progress_report" | "comment" | "user";
export type ReportReason = "spam" | "harassment" | "inappropriate_content" | "other";

export const REPORT_REASONS: ReportReason[] = ["spam", "harassment", "inappropriate_content", "other"];

export async function submitReport(params: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: params.targetType,
    target_id: params.targetId,
    reason: params.reason,
    details: params.details,
  });

  if (error) {
    throw error;
  }
}
