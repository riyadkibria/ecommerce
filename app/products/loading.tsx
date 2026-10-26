export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 h-10 w-64 animate-pulse rounded-lg bg-neutral-200" />

      <div className="mb-8 h-12 animate-pulse rounded-xl bg-neutral-200" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-neutral-200 bg-white p-3"
          >
            <div className="aspect-[4/3] rounded-xl bg-neutral-100" />
            <div className="mt-4 h-4 rounded bg-neutral-100" />
            <div className="mt-3 h-4 w-2/3 rounded bg-neutral-100" />
          </div>
        ))}
      </div>
    </main>
  );
}