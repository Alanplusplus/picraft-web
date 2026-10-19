"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

const PANEL_MAX_HEIGHT = 288;
const VIEWPORT_GAP = 12;
const TYPEAHEAD_RESET_MS = 700;

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 text-ink-500 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0 text-brand-700"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

/**
 * A drop-down that replaces the browser's own `<select>`: the arrow keeps its distance from the border,
 * the list is drawn by the page (rounded, scrollable, with a check mark on the chosen option) and it opens
 * upwards when there is no room below. It follows the ARIA select-only combobox pattern, so the keyboard
 * (arrows, Home, End, Enter, Space, Escape, typing a letter) and screen readers work as they do on a `<select>`.
 */
export function Select({
  id,
  value,
  options,
  onChange,
  labelledBy,
  disabled = false,
}: {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Id of the element that labels the field. */
  labelledBy?: string;
  disabled?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState({ up: false, maxHeight: PANEL_MAX_HEIGHT });

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];

  function openList() {
    if (disabled || options.length === 0) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom - VIEWPORT_GAP;
      const above = rect.top - VIEWPORT_GAP;
      const wanted = Math.min(PANEL_MAX_HEIGHT, options.length * 40 + 12);
      const up = below < wanted && above > below;
      setPlacement({ up, maxHeight: Math.max(160, Math.min(PANEL_MAX_HEIGHT, up ? above : below)) });
    }
    setActive(selectedIndex);
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
    setOpen(false);
  }

  function findByTyping(key: string): number {
    const now = Date.now();
    const state = typed.current;
    state.text = now - state.at > TYPEAHEAD_RESET_MS ? key : state.text + key;
    state.at = now;
    const text = state.text.toLowerCase();
    // Typing the same letter again moves to the next option that starts with it, as a native select does.
    const repeated = [...text].every((char) => char === text[0]);
    const needle = repeated ? text[0] : text;
    const current = open ? active : selectedIndex;
    for (let step = 0; step < options.length; step++) {
      const index = (current + (repeated ? 1 : 0) + step) % options.length;
      if (options[index].label.toLowerCase().startsWith(needle)) return index;
    }
    return -1;
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (!open) {
          openList();
          return;
        }
        setActive((index) => Math.min(last, Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1))));
        return;
      }
      case "Home":
      case "End": {
        event.preventDefault();
        const target = event.key === "Home" ? 0 : last;
        if (open) setActive(target);
        else openList();
        return;
      }
      case "Enter":
      case " ": {
        event.preventDefault();
        if (open) choose(active);
        else openList();
        return;
      }
      case "Escape": {
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        return;
      }
      case "Tab": {
        setOpen(false);
        return;
      }
      default: {
        if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
        const index = findByTyping(event.key);
        if (index < 0) return;
        if (open) setActive(index);
        else if (options[index].value !== value) onChange(options[index].value);
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelledBy}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        // A space bar press clicks a button on key up in some browsers, which would undo the choice.
        onKeyUp={(event) => {
          if (event.key === " ") event.preventDefault();
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border bg-white py-2 pl-3.5 pr-3.5 text-left text-sm text-ink-900 transition focus:outline-none focus-visible:border-ink-900 focus-visible:ring-1 focus-visible:ring-ink-900 disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? "border-ink-900 ring-1 ring-ink-900" : "border-ink-300 hover:border-ink-500"
        }`}
      >
        <span className="truncate">{selected?.label}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={labelledBy}
          // Keeps the focus on the button while the pointer is used inside the list.
          onMouseDown={(event) => event.preventDefault()}
          style={{ maxHeight: placement.maxHeight }}
          className={`absolute inset-x-0 z-40 overflow-y-auto overscroll-contain rounded-xl border border-ink-200 bg-white p-1.5 shadow-xl ${
            placement.up ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(index)}
                onPointerEnter={() => setActive(index)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                  index === active ? "bg-ink-100" : ""
                } ${isSelected ? "font-medium text-ink-950" : "text-ink-800"}`}
              >
                <span>{option.label}</span>
                {isSelected && <Check />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
