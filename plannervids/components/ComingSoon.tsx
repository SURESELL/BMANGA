export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      <p className="mt-4 inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        Not yet implemented
      </p>
    </div>
  );
}
