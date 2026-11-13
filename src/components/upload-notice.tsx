import Link from "next/link";

/**
 * A line under every photo field. Adding a photo is not blocked by a tick box; using the field means the visitor
 * accepts the rules written here (and in the Terms and the Acceptable Use Policy).
 */
export function UploadNotice() {
  return (
    <p className="mt-2 text-xs leading-relaxed text-ink-500">
      Only add photos you own or may use, of people who agree. No photos of children, no fakes of real people.{" "}
      <Link href="/aup" className="font-medium text-ink-700 underline underline-offset-2">
        Acceptable Use Policy
      </Link>
    </p>
  );
}
