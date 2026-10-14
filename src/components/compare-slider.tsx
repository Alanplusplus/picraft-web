"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

interface CompareSliderProps {
  before: string;
  beforeAlt: string;
  after: string;
  afterAlt: string;
  /** Size of the result image; the frame keeps this ratio and the original photo is cropped to fit. */
  width: number;
  height: number;
  sizes: string;
}

/** Before / after viewer: drag the handle (or use the arrow keys) to reveal the original photo over the result. */
export function CompareSlider({ before, beforeAlt, after, afterAlt, width, height, sizes }: CompareSliderProps) {
  const [position, setPosition] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function moveTo(clientX: number) {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveTo(event.clientX);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragging.current) moveTo(event.clientX);
  }

  function stopDragging() {
    dragging.current = false;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 20 : 5;
    let next: number | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = position - step;
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") next = position + step;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 100;
    if (next === null) return;
    event.preventDefault();
    setPosition(Math.min(100, Math.max(0, next)));
  }

  return (
    <div
      ref={frame}
      role="slider"
      tabIndex={0}
      aria-label="Compare the original photo with the result"
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      aria-valuetext={`${Math.round(position)}% original photo`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onKeyDown={onKeyDown}
      className="relative w-full cursor-ew-resize select-none overflow-hidden bg-ink-100 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      style={{ aspectRatio: `${width} / ${height}`, touchAction: "pan-y" }}
    >
      <Image src={after} alt={afterAlt} fill sizes={sizes} draggable={false} className="object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <Image src={before} alt={beforeAlt} fill sizes={sizes} draggable={false} className="object-cover" />
      </div>

      <span className="pointer-events-none absolute left-2 top-2 rounded bg-ink-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
        Original
      </span>
      <span className="pointer-events-none absolute right-2 top-2 rounded bg-brand-800/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
        Result
      </span>

      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_6px_rgba(0,0,0,0.45)]"
        style={{ left: `${position}%` }}
      >
        <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sm font-bold text-ink-900 shadow-md ring-1 ring-ink-200">
          <span aria-hidden="true">⇆</span>
        </span>
      </div>
    </div>
  );
}
