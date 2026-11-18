import { redirect } from "next/navigation";

export const instant = false;

/**
 * Root page — redirects to the dashboard.
 * The proxy will handle sending unauthenticated users to /login.
 */
export default function RootPage() {
  redirect("/dashboard");
}
