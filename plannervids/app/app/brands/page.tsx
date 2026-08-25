import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createBrand } from "@/lib/actions/brands";

export default async function BrandsPage() {
  const session = await getSession();
  const brands = await prisma.brand.findMany({
    where: { workspaceId: session!.workspaceId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Brands</h1>
          <p className="text-sm text-muted-foreground">
            Each brand is fully isolated: its own Brand Brain, accounts, content and calendar.
          </p>
        </div>
      </div>

      <form action={createBrand} className="flex max-w-md gap-2">
        <input
          name="name"
          placeholder="New brand name"
          required
          minLength={2}
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Add brand
        </button>
      </form>

      {brands.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No brands yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/app/brands/${brand.id}`}
              className="rounded-lg border bg-card p-4 hover:border-primary"
            >
              <p className="font-medium">{brand.name}</p>
              <p className="text-xs text-muted-foreground">/{brand.slug}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
