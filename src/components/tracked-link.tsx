"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { trackEvent, type EventParams } from "@/lib/analytics";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  /** Google Analytics event sent when the link is clicked. */
  event: string;
  eventParams?: EventParams;
};

/** A `next/link` that reports a click to Google Analytics. Server components use it to track a link. */
export function TrackedLink({ event, eventParams, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        onClick?.(e);
        trackEvent(event, eventParams);
      }}
    />
  );
}
