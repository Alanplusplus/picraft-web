/* eslint-disable @next/next/no-img-element -- share images are rendered by ImageResponse, which takes plain img tags */
import { ImageResponse } from "next/og";

import { getGenerator } from "@/lib/generators";
import { imageDataUri, OG_COLORS, OG_SIZE } from "@/lib/og";

/** The share image of a generator page: name, summary and badge next to the cover. */
export async function generatorShareImage(slug: string) {
  const generator = getGenerator(slug);
  if (!generator) return new Response("Not found", { status: 404 });

  const [logo, wordmark, cover] = await Promise.all([
    imageDataUri("logo-128.png", 128),
    imageDataUri("wordmark-2x.png", 486),
    imageDataUri(`generators/${generator.slug}.webp`, 900),
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
            <div style={{ fontSize: 26, color: OG_COLORS.brand700, marginBottom: 14 }}>AI image generator</div>
            <div style={{ fontSize: generator.name.length > 22 ? 62 : 72, lineHeight: 1.05, color: OG_COLORS.ink950 }}>
              {generator.name}
            </div>
            <div style={{ fontSize: 28, lineHeight: 1.3, color: OG_COLORS.ink700, marginTop: 22 }}>{generator.summary}</div>
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
              {generator.badge}
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
    OG_SIZE,
  );
}
