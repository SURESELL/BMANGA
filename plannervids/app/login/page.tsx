import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/layout/LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/app/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">PlannerVids</h1>
          <p className="mt-1 text-sm text-muted-foreground">Social Media Command Center</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
