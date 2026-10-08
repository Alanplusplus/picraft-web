"use client";

/** Last-resort fallback when the root layout itself fails, so it brings its own <html> and inline styles. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", color: "#1b1e24", textAlign: "center", padding: "6rem 1rem" }}>
        <h1 style={{ fontSize: "1.875rem", margin: 0 }}>PiCraft is temporarily unavailable</h1>
        <p style={{ marginTop: "0.75rem", color: "#3d424c" }}>Please try again in a moment.</p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "1.5rem",
            padding: "0.75rem 1.25rem",
            border: 0,
            borderRadius: "0.75rem",
            background: "#0f1115",
            color: "#ffffff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
