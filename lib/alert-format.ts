export type AlertReason = "new_issue" | "regression";

const REASON_PREFIX: Record<AlertReason, string> = {
  new_issue: "New issue: ",
  regression: "Regression: ",
};

/** The log message, prefixed with why the alert fired when it's issue-based. */
export function alertHeadline(log: {
  message: string;
  alert_reason?: AlertReason | null;
}): string {
  return (
    (log.alert_reason ? REASON_PREFIX[log.alert_reason] : "") + log.message
  );
}
