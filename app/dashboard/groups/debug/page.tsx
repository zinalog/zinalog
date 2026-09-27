import { redirect } from "next/navigation";

export default function DebugGroupsPage() {
  redirect("/dashboard/logs/debug");
}
