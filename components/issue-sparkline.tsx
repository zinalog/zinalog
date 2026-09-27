"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const TOOLTIP_STYLE = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--text-base)",
};
const TOOLTIP_LABEL_STYLE = { color: "var(--text-base)", marginBottom: 4 };

function formatHour(hour: string): string {
  return new Date(hour.replace(" ", "T") + "Z").toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    hour12: true,
  });
}

export default function IssueSparkline({
  hourly,
  color,
}: {
  hourly: Array<{ hour: string; count: number }>;
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={90}>
      <BarChart data={hourly} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <XAxis dataKey="hour" hide />
        <Tooltip
          cursor={{ fill: "var(--border)", opacity: 0.4 }}
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          labelFormatter={(hour) => formatHour(String(hour))}
          formatter={(value) => [value, "Occurrences"]}
        />
        <Bar
          dataKey="count"
          fill={color}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
