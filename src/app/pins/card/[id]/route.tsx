/* eslint-disable @next/next/no-img-element -- satori renders plain <img> tags */
import type { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import type { ReactElement } from "react";

import { stripInline } from "@/lib/inline";
import { imageDataUri, OG_COLORS, publicImageDataUri } from "@/lib/og";
import {
  CARD_LAYOUT,
  CARD_SCALE,
  CARD_SIZE,
  collageExample,
  findExample,
  getDailyPins,
  sheetTable,
  type FeedItem,
} from "@/lib/pinterest";

/**
 * Pin cards drawn in code: cheat sheets, collages, demos and before/after pairs (see `lib/pinterest.ts`).
 * A card is designed on a 1000×1500 grid and every length goes through `u()`, so it is drawn at 2×
 * (2000×3000 PNG). The build writes it to `.next`; the agent uploads that file to image storage, and the
 * feed links to the stored original. This route is only the renderer; it is not what Pinterest reads.
 */
export const dynamicParams = false;

/** A length on the 1000×1500 design grid, in output pixels. */
const u = (n: number) => n * CARD_SCALE;

const PAD = 56;
const INNER = CARD_LAYOUT.width - PAD * 2;
const INK = { color: OG_COLORS.ink950 } as const;
const BORDER = `${u(2)}px solid #e4e6ea`;

function cards(): Map<string, FeedItem> {
  return new Map(getDailyPins().filter((pin) => pin.kind !== "image").map((pin) => [`${pin.id}.png`, pin]));
}

export function generateStaticParams() {
  return [...cards().keys()].map((id) => ({ id }));
}

function frame(children: ReactElement[]): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: u(PAD),
        background: `linear-gradient(160deg, ${OG_COLORS.brand50}, #ffffff)`,
      }}
    >
      {children}
    </div>
  );
}

async function brandAssets() {
  return Promise.all([imageDataUri("logo-128.png", 256), imageDataUri("wordmark-2x.png", 486)]);
}

function header(logo: string, wordmark: string, heading: string, subtitle?: string) {
  return (
    <div key="header" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <img src={logo} width={u(48)} height={u(48)} alt="" />
        <img src={wordmark} width={u(146)} height={u(33)} alt="" style={{ marginLeft: u(12) }} />
      </div>
      <div style={{ ...INK, fontSize: u(64), lineHeight: 1.08, marginTop: u(32) }}>{heading}</div>
      {subtitle && <div style={{ fontSize: u(30), color: OG_COLORS.ink700, marginTop: u(12) }}>{subtitle}</div>}
    </div>
  );
}

function chipsRow(chips: string[]) {
  return (
    <div key="chips" style={{ display: "flex", flexWrap: "wrap", marginTop: u(8) }}>
      {chips.map((chip) => (
        <div
          key={chip}
          style={{
            display: "flex",
            background: "#ffffff",
            border: `${u(2)}px solid ${OG_COLORS.brand700}`,
            borderRadius: u(999),
            padding: `${u(10)}px ${u(26)}px`,
            fontSize: u(30),
            color: OG_COLORS.brand700,
            marginRight: u(12),
            marginBottom: u(12),
          }}
        >
          {chip}
        </div>
      ))}
    </div>
  );
}

function footer(where: string, note?: string) {
  return (
    <div key="footer" style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
      {note && <div style={{ fontSize: u(22), color: OG_COLORS.ink700 }}>{note}</div>}
      <div style={{ fontSize: u(28), color: OG_COLORS.brand700, marginTop: u(6) }}>{`picraft.ai${where}`}</div>
    </div>
  );
}

function tile(src: string, width: number, height: number, text?: string, key?: string, fit: "cover" | "contain" = "cover") {
  return (
    <div
      key={key}
      style={{
        display: "flex",
        position: "relative",
        width: u(width),
        height: u(height),
        borderRadius: u(20),
        overflow: "hidden",
        border: BORDER,
        background: "#ffffff",
      }}
    >
      <img src={src} width={u(width)} height={u(height)} alt="" style={{ objectFit: fit }} />
      {text && (
        <div
          style={{
            position: "absolute",
            left: u(14),
            bottom: u(14),
            display: "flex",
            background: "#ffffff",
            borderRadius: u(999),
            padding: `${u(6)}px ${u(18)}px`,
            fontSize: u(26),
            color: OG_COLORS.ink950,
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

/** Example images are embedded at their own size, which is enough for the 2× card. */
const SOURCE_WIDTH = 1000;

async function sheetCard(pin: FeedItem) {
  const found = sheetTable(pin.data);
  if (!found || !pin.data.sheet) throw new Error(`Pin ${pin.id} has no table`);
  const [logo, wordmark] = await brandAssets();
  const rows = found.table.rows.map((row) => row.map((cell) => stripInline(cell)));
  // Eight-row tables are tightened so the footer still fits.
  const compact = rows.length >= 8;

  return frame([
    header(logo, wordmark, pin.data.sheet.heading, pin.data.sheet.subtitle),
    <div key="rows" style={{ display: "flex", flexDirection: "column", marginTop: u(36) }}>
      {rows.map(([name, value]) => (
        <div
          key={name}
          style={{
            display: "flex",
            flexDirection: "column",
            background: "#ffffff",
            border: BORDER,
            borderRadius: u(20),
            padding: `${u(compact ? 10 : 16)}px ${u(28)}px`,
            marginBottom: u(compact ? 10 : 14),
          }}
        >
          <div style={{ fontSize: u(compact ? 22 : 24), color: OG_COLORS.ink700 }}>{name}</div>
          <div style={{ ...INK, fontSize: u(compact ? 31 : 36), lineHeight: 1.2, marginTop: u(4) }}>{value}</div>
        </div>
      ))}
    </div>,
    footer(pin.data.link, "Details and sources"),
  ]);
}

async function collageCard(pin: FeedItem) {
  const items = pin.data.collage?.items ?? [];
  const [logo, wordmark] = await brandAssets();
  const examples = items.map((item) => {
    const example = collageExample(item.scene, item.style);
    if (!example) throw new Error(`Pin ${pin.id}: no example for ${item.scene}/${item.style}`);
    return example;
  });
  const images = await Promise.all(examples.map((example) => publicImageDataUri(example.url, SOURCE_WIDTH)));
  const cellW = (INNER - 20) / 2;

  return frame([
    header(logo, wordmark, pin.data.collage?.heading ?? pin.title),
    <div
      key="grid"
      style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", marginTop: u(28) }}
    >
      {items.map((item, index) => (
        <div key={item.style} style={{ display: "flex", marginBottom: u(20) }}>
          {tile(images[index], cellW, 530, item.label, undefined, examples[index].height / examples[index].width < 1.2 ? "contain" : "cover")}
        </div>
      ))}
    </div>,
  ]);
}

async function demoCard(pin: FeedItem) {
  const demo = pin.data.demo;
  const example = demo && findExample(demo.scene, demo.example);
  if (!demo || !example) throw new Error(`Pin ${pin.id}: no example`);
  const [logo, wordmark] = await brandAssets();
  const image = await publicImageDataUri(example.url, SOURCE_WIDTH);
  const ratio = example.height / example.width;
  // Portrait and near-square results sit beside the form; wide ones (thumbnails, banners) go under it.
  const portrait = ratio > 0.8;
  const imageWidth = portrait ? 460 : INNER;
  const imageHeight = portrait ? Math.min(Math.round(460 * ratio), 720) : Math.min(Math.round(INNER * ratio), 520);

  const form = (
    <div
      key="form"
      style={{
        display: "flex",
        flexDirection: "column",
        ...(portrait ? { flex: 1 } : { flexShrink: 0 }),
        background: "#ffffff",
        border: BORDER,
        borderRadius: u(20),
        padding: `${u(22)}px ${u(26)}px`,
        marginRight: portrait ? u(24) : 0,
      }}
    >
      <div style={{ fontSize: u(24), color: OG_COLORS.brand700, marginBottom: u(6) }}>What you type</div>
      {demo.inputs.map((input) => (
        <div key={input.label} style={{ display: "flex", flexDirection: "column", marginTop: u(12) }}>
          <div style={{ fontSize: u(22), color: OG_COLORS.ink700 }}>{input.label}</div>
          <div style={{ ...INK, fontSize: u(31), lineHeight: 1.2 }}>{input.value}</div>
        </div>
      ))}
    </div>
  );

  return frame([
    header(logo, wordmark, demo.heading),
    <div
      key="body"
      style={{
        display: "flex",
        flexDirection: portrait ? "row" : "column",
        marginTop: u(30),
        marginBottom: u(20),
      }}
    >
      {form}
      <div style={{ display: "flex", marginTop: portrait ? 0 : u(20) }}>
        {tile(image, imageWidth, imageHeight, "The result")}
      </div>
    </div>,
    chipsRow(demo.chips),
    footer(pin.data.link),
  ]);
}

async function beforeAfterCard(pin: FeedItem) {
  const pair = pin.data.beforeafter;
  const example = pair && findExample(pair.scene, pair.example);
  if (!pair || !example?.before) throw new Error(`Pin ${pin.id}: no before and after pair`);
  const [logo, wordmark] = await brandAssets();
  const [before, after] = await Promise.all([
    publicImageDataUri(example.before, SOURCE_WIDTH),
    publicImageDataUri(example.url, SOURCE_WIDTH),
  ]);
  const ratio = example.height / example.width;
  const stacked = ratio <= 1.2;
  // Stacked pairs keep the photo's own shape, so a product is never cut off; side by side fills the width.
  const cellH = stacked ? 480 : Math.round(((INNER - 20) / 2) * Math.min(ratio, 1.5));
  const cellW = stacked ? Math.min(INNER, Math.round(cellH / ratio)) : (INNER - 20) / 2;

  return frame([
    header(logo, wordmark, pair.heading),
    <div
      key="pair"
      style={{
        display: "flex",
        flexDirection: stacked ? "column" : "row",
        alignItems: stacked ? "center" : "flex-start",
        justifyContent: "space-between",
        marginTop: u(28),
        marginBottom: u(20),
      }}
    >
      {tile(before, cellW, cellH, "Before", "before")}
      <div style={{ display: "flex", height: stacked ? u(20) : 0 }} />
      {tile(after, cellW, cellH, "After", "after")}
    </div>,
    chipsRow(pair.chips),
    footer(pin.data.link),
  ]);
}

export async function GET(_request: NextRequest, ctx: RouteContext<"/pins/card/[id]">) {
  const { id } = await ctx.params;
  const pin = cards().get(id);
  if (!pin) return new Response("Not found", { status: 404 });

  const element =
    pin.kind === "sheet"
      ? await sheetCard(pin)
      : pin.kind === "collage"
        ? await collageCard(pin)
        : pin.kind === "demo"
          ? await demoCard(pin)
          : await beforeAfterCard(pin);

  const image = new ImageResponse(element, CARD_SIZE);
  return new Response(image.body, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
