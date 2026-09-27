import { redirect } from "next/navigation";

// Error groups now live on the error issues page.
export default function ErrorsPage() {
  redirect("/dashboard/logs/errors");
}
