import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-ink-950">Page not found</h1>
      <p className="mt-3 text-ink-700">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/create"
        className="mt-6 inline-block rounded-xl bg-ink-950 px-5 py-3 text-sm font-semibold text-white hover:bg-ink-800"
      >
        See all makers
      </Link>
    </div>
  );
}
