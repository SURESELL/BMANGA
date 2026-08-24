"use client";

import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Topbar({ email }: { email: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="text-sm text-muted-foreground">{email}</div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          onClick={logout}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
