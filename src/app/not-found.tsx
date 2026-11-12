import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-ink-950">Page not found</h1>
      <p className="mt-3 text-ink-700">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/create"
        className="btn-primary mt-6"
      >
        See all makers
      </Link>
    </div>
  );
}
