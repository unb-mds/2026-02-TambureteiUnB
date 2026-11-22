export function hasApprovalData(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function formatPositiveMetric(
  value: number | null | undefined,
  suffix = "",
): string {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? `${value}${suffix}`
    : "Sem dados";
}
