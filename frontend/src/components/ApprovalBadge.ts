import { createElement, type ReactElement } from "react";

interface ApprovalBadgeProps {
  approval?: number | null;
}

export default function ApprovalBadge({
  approval,
}: ApprovalBadgeProps): ReactElement {
  const hasApprovalData =
    typeof approval === "number" && Number.isFinite(approval) && approval > 0;

  if (!hasApprovalData) {
    return createElement(
      "span",
      {
        className:
          "rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500",
      },
      "Sem dados"
    );
  }

  const className =
    approval >= 70
      ? "rounded-full bg-[#E9F9F3] px-2.5 py-1 text-xs font-semibold text-[#067A59]"
      : "rounded-full bg-[#FFF7E8] px-2.5 py-1 text-xs font-semibold text-[#925600]";

  return createElement(
    "span",
    { className },
    `${approval}% de aprovação`
  );
}
