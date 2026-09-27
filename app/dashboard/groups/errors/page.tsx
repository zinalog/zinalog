import { redirect } from "next/navigation";

export default function ErrorGroupsPage() {
  redirect("/dashboard/logs/errors");
}
