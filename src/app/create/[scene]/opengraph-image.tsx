import { ImageResponse } from "next/og";

import { imageDataUri, OG_COLORS, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { getScene, getScenes } from "@/lib/scenes";
import { CATEGORIES } from "@/lib/site";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getScenes().map((scene) => ({ scene: scene.slug }));
}

export default async function Image({ params }: { params: Promise<{ scene: string }> }) {
  const scene = getScene((await params).scene);
  if (!scene) return new Response("Not found", { status: 404 });

  const category = CATEGORIES.find((c) => c.id === scene.category)?.name ?? "";
  const [logo, wordmark, cover] = await Promise.all([
    imageDataUri("logo-128.png", 128),
    imageDataUri("wordmark-2x.png", 486),
    imageDataUri(`scenes/${scene.slug}.webp`, 900),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, ${OG_COLORS.brand50}, #ffffff)`,
          padding: 64,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 560 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={logo} width={48} height={48} alt="" />
            <img src={wordmark} width={146} height={34} alt="" style={{ marginLeft: 10 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, color: OG_COLORS.brand700, marginBottom: 14 }}>{category}</div>
            <div style={{ fontSize: scene.name.length > 22 ? 62 : 72, lineHeight: 1.05, color: OG_COLORS.ink950 }}>
              {scene.name}
            </div>
            <div style={{ fontSize: 28, lineHeight: 1.3, color: OG_COLORS.ink700, marginTop: 22 }}>{scene.summary}</div>
          </div>
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                color: OG_COLORS.brand700,
                background: "#ffe3d9",
                borderRadius: 999,
                padding: "8px 20px",
              }}
            >
              {scene.badge}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end", marginLeft: 40 }}>
          <img
            src={cover}
            width={480}
            height={360}
            alt=""
            style={{ borderRadius: 24, border: "2px solid #e4e6ea" }}
          />
        </div>
      </div>
    ),
    size,
  );
}
