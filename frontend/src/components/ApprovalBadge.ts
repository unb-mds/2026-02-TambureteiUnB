import { hasApprovalData } from "../utils/academicMetrics.ts";
import { createElement, type ReactElement } from "react";

interface ApprovalBadgeProps {
  approval?: number | null;
}

export default function ApprovalBadge({
  approval,
}: ApprovalBadgeProps): ReactElement {
  const approvalValue = hasApprovalData(approval) ? approval : null;
  const hasVisibleApproval = approvalValue !== null && approvalValue > 0;
  const status = hasVisibleApproval
    ? approvalValue >= 70
      ? "success"
      : "warning"
    : "neutral";
  const style = {
    backgroundColor: `var(--status-${status}-bg)`,
    borderColor: `var(--status-${status}-border)`,
    color: `var(--status-${status}-text)`,
  };

  return createElement(
    "span",
    {
      className:
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
      style,
    },
    hasVisibleApproval ? `${approvalValue}% de aprovação` : "Sem dados"
  );
}
