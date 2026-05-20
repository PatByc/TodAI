import { redirect } from "next/navigation";

export default function HomePage() {
  // Root should land on the public welcome page before the user reaches login or the app workspace.
  redirect("/main");
}
