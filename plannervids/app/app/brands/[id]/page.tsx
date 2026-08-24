import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { updateBrandGuideline } from "@/lib/actions/brands";

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  const brand = await prisma.brand.findFirst({
    where: { id, workspaceId: session!.workspaceId, deletedAt: null },
    include: { guideline: true },
  });

  if (!brand) {
    notFound();
  }

  const guideline = brand.guideline;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{brand.name}</h1>
        <p className="text-sm text-muted-foreground">Brand Brain</p>
      </div>

      <form action={updateBrandGuideline} className="space-y-4">
        <input type="hidden" name="brandId" value={brand.id} />

        <Field label="Description">
          <textarea name="description" defaultValue={guideline?.description ?? ""} rows={3} className={inputClass} />
        </Field>
        <Field label="Positioning">
          <textarea name="positioning" defaultValue={guideline?.positioning ?? ""} rows={2} className={inputClass} />
        </Field>
        <Field label="Tone of voice">
          <input name="tone" defaultValue={guideline?.tone ?? ""} className={inputClass} />
        </Field>
        <Field label="Promise">
          <input name="promise" defaultValue={guideline?.promise ?? ""} className={inputClass} />
        </Field>
        <Field label="Hashtags (one per line)">
          <textarea
            name="hashtags"
            defaultValue={(guideline?.hashtags ?? []).join("\n")}
            rows={3}
            className={inputClass}
          />
        </Field>
        <Field label="Forbidden phrases (one per line)">
          <textarea
            name="forbiddenPhrases"
            defaultValue={(guideline?.forbiddenPhrases ?? []).join("\n")}
            rows={3}
            className={inputClass}
          />
        </Field>
        <Field label="Priority topics (one per line)">
          <textarea
            name="priorityTopics"
            defaultValue={(guideline?.priorityTopics ?? []).join("\n")}
            rows={3}
            className={inputClass}
          />
        </Field>
        <Field label="Forbidden topics (one per line)">
          <textarea
            name="forbiddenTopics"
            defaultValue={(guideline?.forbiddenTopics ?? []).join("\n")}
            rows={3}
            className={inputClass}
          />
        </Field>

        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Save Brand Brain
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
