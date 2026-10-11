import { redirect } from "next/navigation";

export default function AppPage() {
  // Redirect to Evidence Center (Domain 1 primary entrypoint)
  redirect("/app/evidence");
}
